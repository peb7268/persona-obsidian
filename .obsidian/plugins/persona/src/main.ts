import { Plugin, TFile, EventRef, Notice, Menu, Editor, MarkdownView } from 'obsidian';
import { PersonaSettings, DEFAULT_SETTINGS, MHM_AGENTS } from './types';
import { ExecutionService } from './services/ExecutionService';
import { SyntaxParser } from './services/SyntaxParser';
import { TaskSyntaxService } from './services/TaskSyntaxService';
import { JobQueueService } from './services/JobQueueService';
import { AgentModal } from './ui/AgentModal';
import { StatusBarManager } from './ui/StatusBar';
import { PersonaSettingTab } from './ui/SettingsTab';
import { LogViewerModal } from './ui/LogViewerModal';
import { ExtractNoteModal } from './ui/ExtractNoteModal';
import { JobQueueModal } from './ui/JobQueueModal';
import * as fs from 'fs';
import * as path from 'path';

export default class PersonaPlugin extends Plugin {
  settings: PersonaSettings;
  executionService: ExecutionService;
  syntaxParser: SyntaxParser;
  taskSyntaxService: TaskSyntaxService;
  jobQueueService: JobQueueService;
  statusBar: StatusBarManager | null = null;
  private ribbonIconEl: HTMLElement | null = null;
  private statusBarEl: HTMLElement | null = null;
  private fileWatcherRef: EventRef | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private processTimeout: ReturnType<typeof setTimeout> | null = null;

  async onload() {
    await this.loadSettings();

    // Initialize services
    this.executionService = new ExecutionService(this.settings);
    this.syntaxParser = new SyntaxParser();
    this.taskSyntaxService = new TaskSyntaxService();
    this.jobQueueService = new JobQueueService(this.settings);

    // Add settings tab
    this.addSettingTab(new PersonaSettingTab(this.app, this));

    // Setup UI elements
    this.updateRibbonIcon();
    this.updateStatusBar();

    // Register commands
    this.registerCommands();

    // Initialize auto-processing
    this.updateFileWatcher();
    this.updatePolling();
  }

  onunload() {
    // Cleanup file watcher
    if (this.fileWatcherRef) {
      this.app.vault.offref(this.fileWatcherRef);
      this.fileWatcherRef = null;
    }
    // Cleanup polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    // Cleanup debounce timeout
    if (this.processTimeout) {
      clearTimeout(this.processTimeout);
      this.processTimeout = null;
    }
    // Cleanup progress polling
    this.stopProgressPolling();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Update execution service with new settings
    this.executionService = new ExecutionService(this.settings);
  }

  updateRibbonIcon() {
    // Remove existing icon if present
    if (this.ribbonIconEl) {
      this.ribbonIconEl.remove();
      this.ribbonIconEl = null;
    }

    // Add new icon if enabled
    if (this.settings.showRibbonIcon) {
      this.ribbonIconEl = this.addRibbonIcon('bot', 'Persona', () => {
        new AgentModal(this.app, this).open();
      });
    }
  }

  updateStatusBar() {
    // Remove existing status bar if present
    if (this.statusBarEl) {
      this.statusBarEl.remove();
      this.statusBarEl = null;
      this.statusBar = null;
    }

    // Add new status bar if enabled
    if (this.settings.showStatusBar) {
      this.statusBarEl = this.addStatusBarItem();
      this.statusBar = new StatusBarManager(this.statusBarEl, this.settings);

      // Add click handler to show agent modal
      this.statusBar.setClickHandler(() => {
        new AgentModal(this.app, this).open();
      });

      // Add view queue handler
      this.statusBar.setViewQueueHandler(() => {
        new JobQueueModal(this.app, this.jobQueueService).open();
      });
    }
  }

  private registerCommands() {
    // Open agent modal
    this.addCommand({
      id: 'open-agent-modal',
      name: 'Open agent runner',
      callback: () => {
        new AgentModal(this.app, this).open();
      },
    });

    // Enforce task syntax
    this.addCommand({
      id: 'enforce-task-syntax',
      name: 'Enforce task syntax in current file',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        const content = editor.getValue();
        const today = this.taskSyntaxService.getTodayString();
        const newContent = this.taskSyntaxService.enforceTaskSyntax(content, today);

        if (content !== newContent) {
          editor.setValue(newContent);
          new Notice('Task syntax enforced');
        } else {
          new Notice('All tasks already have correct syntax');
        }
      },
    });

    // Extract to atomic note
    this.addCommand({
      id: 'extract-to-note',
      name: 'Extract to Atomic Note',
      editorCallback: (editor, view) => {
        const selection = editor.getSelection();
        if (!selection || selection.trim().length === 0) {
          new Notice('Select text to extract');
          return;
        }
        if (selection.length < 10) {
          new Notice('Selection too short (min 10 characters)');
          return;
        }
        const file = view.file;
        if (!file) {
          new Notice('No active file');
          return;
        }
        new ExtractNoteModal(this.app, this, selection, file).open();
      },
    });

    // Run morning briefing
    this.addCommand({
      id: 'run-morning-briefing',
      name: 'Run morning briefing',
      callback: async () => {
        await this.runAgentCommand('assistant', 'morning-briefing');
      },
    });

    // Run evening summary
    this.addCommand({
      id: 'run-evening-summary',
      name: 'Run evening summary',
      callback: async () => {
        await this.runAgentCommand('assistant', 'evening-summary');
      },
    });

    // Process research questions from current file
    this.addCommand({
      id: 'process-research-questions',
      name: 'Process research questions in current file',
      callback: async () => {
        await this.processResearchQuestions();
      },
    });

    // Run researcher agent
    this.addCommand({
      id: 'run-researcher',
      name: 'Run research queue processor',
      callback: async () => {
        await this.runAgentCommand('researcher', 'process-research-queue');
      },
    });

    // Open agent logs folder
    this.addCommand({
      id: 'open-agent-logs',
      name: 'Open agent logs folder',
      callback: () => {
        const logsPath = path.join(
          this.settings.personaRoot,
          'instances',
          this.settings.business,
          'logs',
          'agents'
        );
        require('electron').shell.openPath(logsPath);
      },
    });

    // View today's researcher log
    this.addCommand({
      id: 'view-researcher-log',
      name: "View today's researcher log",
      callback: async () => {
        const today = this.getTodayString();
        const logPath = path.join(
          this.settings.personaRoot,
          'instances',
          this.settings.business,
          'logs',
          'agents',
          `researcher-${today}.log`
        );
        const logContent = await this.readLogFile(logPath);
        new LogViewerModal(this.app, `Researcher Log - ${today}`, logContent).open();
      },
    });

    // View any agent log (generic command)
    this.addCommand({
      id: 'view-agent-log',
      name: 'View agent log...',
      callback: async () => {
        const today = this.getTodayString();
        // Show a quick picker for agent selection would be ideal
        // For now, open researcher log as default
        const logPath = path.join(
          this.settings.personaRoot,
          'instances',
          this.settings.business,
          'logs',
          'agents',
          `researcher-${today}.log`
        );
        const logContent = await this.readLogFile(logPath);
        new LogViewerModal(this.app, `Agent Log - ${today}`, logContent).open();
      },
    });

    // Register commands for each agent/action combo
    for (const agent of MHM_AGENTS) {
      for (const action of agent.actions) {
        this.addCommand({
          id: `run-${agent.name}-${action}`,
          name: `Run ${agent.name}: ${action}`,
          callback: async () => {
            await this.runAgentCommand(agent.name, action);
          },
        });
      }
    }
  }

  private progressPollInterval: ReturnType<typeof setInterval> | null = null;

  private async runAgentCommand(agent: string, action: string) {
    if (this.statusBar) {
      this.statusBar.setRunning(agent);
    }

    // Start polling for progress updates
    this.startProgressPolling();

    try {
      await this.executionService.runAgent(agent, action);

      // Force refresh of daily notes after agent completion
      // This ensures Obsidian sees external file modifications
      await this.refreshDailyNotes();
    } finally {
      // Stop polling
      this.stopProgressPolling();

      if (this.statusBar) {
        this.statusBar.setReady();
      }
    }
  }

  /**
   * Start polling progress.json for status updates
   */
  private startProgressPolling() {
    // Clear any existing interval
    this.stopProgressPolling();

    // Poll every 2 seconds
    this.progressPollInterval = setInterval(() => {
      this.updateProgressDisplay();
    }, 2000);

    // Also do an immediate update
    setTimeout(() => this.updateProgressDisplay(), 500);
  }

  /**
   * Stop progress polling
   */
  private stopProgressPolling() {
    if (this.progressPollInterval) {
      clearInterval(this.progressPollInterval);
      this.progressPollInterval = null;
    }
  }

  /**
   * Update status bar with current progress
   */
  private updateProgressDisplay() {
    if (!this.statusBar) return;

    const progress = this.executionService.getProgress();
    if (progress && progress.status === 'running') {
      const elapsed = this.executionService.getElapsedTime(progress);
      this.statusBar.setProgress(progress, elapsed);
    }
  }

  /**
   * Force Obsidian to reload daily notes that may have been modified externally
   */
  private async refreshDailyNotes() {
    const dailyNotePattern = /Resources\/Agenda\/Daily\/\d{4}-\d{2}-\d{2}\.md$/;
    const activeFile = this.app.workspace.getActiveFile();

    // If active file is a daily note, reload it
    if (activeFile && activeFile.path.match(dailyNotePattern)) {
      try {
        // Re-open the file to force a refresh
        const leaf = this.app.workspace.getLeaf(false);
        if (leaf) {
          await leaf.openFile(activeFile, { state: { mode: 'source' } });
        }
      } catch (err) {
        console.error('Failed to refresh daily note:', err);
      }
    }

    // Also refresh today's daily note if it exists
    const today = this.getTodayString();
    const todayPath = `Resources/Agenda/Daily/${today}.md`;
    const todayFile = this.app.vault.getAbstractFileByPath(todayPath);

    if (todayFile instanceof TFile && todayFile !== activeFile) {
      // Trigger a vault event to refresh any views watching this file
      this.app.vault.trigger('modify', todayFile);
    }
  }

  private async processResearchQuestions() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return;
    }

    const content = await this.app.vault.read(activeFile);
    const questions = this.syntaxParser.getQuestions(content);

    if (questions.length === 0) {
      return;
    }

    // For now, just trigger the research queue processor
    // Future: could pass questions directly to the agent
    await this.runAgentCommand('researcher', 'process-research-queue');
  }

  // File watcher for auto-processing on save
  updateFileWatcher() {
    // Remove existing watcher
    if (this.fileWatcherRef) {
      this.app.vault.offref(this.fileWatcherRef);
      this.fileWatcherRef = null;
    }

    // Add new watcher if enabled
    if (this.settings.autoProcessOnSave) {
      this.fileWatcherRef = this.app.vault.on('modify', async (file) => {
        // Only trigger for daily notes
        if (file instanceof TFile && file.path.match(/Resources\/Agenda\/Daily\/\d{4}-\d{2}-\d{2}\.md$/)) {
          const content = await this.app.vault.read(file);
          const questions = this.syntaxParser.getQuestions(content);
          if (questions.length > 0) {
            this.debouncedProcessQuestions();
          }
        }
      });
    }
  }

  // Debounced processing to avoid multiple triggers
  private debouncedProcessQuestions() {
    if (this.processTimeout) {
      clearTimeout(this.processTimeout);
    }
    this.processTimeout = setTimeout(() => {
      this.runAgentCommand('researcher', 'process-research-queue');
    }, 5000); // 5 second debounce
  }

  // Polling timer for periodic checks
  updatePolling() {
    // Clear existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Set new interval if enabled
    if (this.settings.pollingEnabled) {
      const ms = this.settings.pollingIntervalMinutes * 60 * 1000;
      this.pollingInterval = setInterval(() => {
        this.checkAndProcessQuestions();
      }, ms);
    }
  }

  // Check for questions and process if found
  private async checkAndProcessQuestions() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyNotePath = `Resources/Agenda/Daily/${today}.md`;
    const file = this.app.vault.getAbstractFileByPath(dailyNotePath);

    if (file instanceof TFile) {
      const content = await this.app.vault.read(file);
      const questions = this.syntaxParser.getQuestions(content);
      if (questions.length > 0) {
        await this.runAgentCommand('researcher', 'process-research-queue');
      }
    }
  }

  // Read log file from disk
  private async readLogFile(logPath: string): Promise<string> {
    try {
      return fs.readFileSync(logPath, 'utf8');
    } catch (err) {
      return `Error reading log file: ${err}`;
    }
  }

  // Get today's date string
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }
}
