import { Plugin, TFile, EventRef, Notice, Menu, Editor, MarkdownView } from 'obsidian';
import { PersonaSettings, DEFAULT_SETTINGS, MHM_AGENTS } from './types';
import { ExecutionService } from './services/ExecutionService';
import { SyntaxParser } from './services/SyntaxParser';
import { TaskSyntaxService } from './services/TaskSyntaxService';
import { JobQueueService } from './services/JobQueueService';
import { QueueConsumerService } from './services/QueueConsumerService';
import { ExecutionSlotManager } from './services/ExecutionSlotManager';
import { EventService, JobChangeEvent } from './services/EventService';
import { ServiceManager, createManagedService, LifecycleEvent } from './services/ServiceManager';
import { MCPClientService, MCPHealthResult } from './services/MCPClientService';
import { CalendarFetchService } from './services/CalendarFetchService';
import { CalendarJobHandler } from './services/CalendarJobHandler';
import { CalendarLogger } from './services/CalendarLogger';
import { TimezoneResolver } from './services/TimezoneResolver';
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
  queueConsumer: QueueConsumerService | null = null;
  slotManager: ExecutionSlotManager | null = null;
  eventService: EventService | null = null;
  serviceManager: ServiceManager | null = null;
  statusBar: StatusBarManager | null = null;
  // Calendar/MCP services
  mcpClient: MCPClientService | null = null;
  calendarFetchService: CalendarFetchService | null = null;
  calendarJobHandler: CalendarJobHandler | null = null;
  calendarLogger: CalendarLogger | null = null;
  private ribbonIconEl: HTMLElement | null = null;
  private statusBarEl: HTMLElement | null = null;
  private fileWatcherRef: EventRef | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private processTimeout: ReturnType<typeof setTimeout> | null = null;
  private calendarSchedulerInterval: ReturnType<typeof setInterval> | null = null;
  private lastCalendarFetchDate: string | null = null;
  private lifecycleUnsubscribe: (() => void) | null = null;

  async onload() {
    console.log('[Persona] Plugin loading...');
    const loadStart = Date.now();

    await this.loadSettings();

    // Initialize core services (non-async, no lifecycle management needed)
    this.jobQueueService = new JobQueueService(this.settings);
    this.executionService = new ExecutionService(this.settings, this.jobQueueService);
    this.syntaxParser = new SyntaxParser();
    this.taskSyntaxService = new TaskSyntaxService();

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

    // Initialize ServiceManager for managed services
    this.serviceManager = new ServiceManager('[Persona]');
    this.serviceManager.setShutdownTimeout(5000);

    // Subscribe to lifecycle events for logging
    this.lifecycleUnsubscribe = this.serviceManager.onLifecycleEvent((event: LifecycleEvent) => {
      this.logLifecycleEvent(event);
    });

    // Initialize and register managed services
    await this.initializeQueueConsumer();

    // Initialize calendar services if enabled
    this.initializeCalendarServices();

    // Start all managed services
    if (this.settings.queueConsumerEnabled) {
      await this.serviceManager.startAll();
    }

    const loadTime = Date.now() - loadStart;
    console.log(`[Persona] Plugin loaded in ${loadTime}ms`);
  }

  /**
   * Log lifecycle events with consistent formatting
   */
  private logLifecycleEvent(event: LifecycleEvent): void {
    const time = event.timestamp.toISOString().split('T')[1].split('.')[0];
    const duration = event.durationMs ? ` (${event.durationMs}ms)` : '';
    const details = event.details ? `: ${event.details}` : '';
    console.log(`[Persona] [${time}] ${event.service} ${event.event}${duration}${details}`);
  }

  async onunload() {
    console.log('[Persona] Plugin unloading...');
    const unloadStart = Date.now();

    // Stop all managed services via ServiceManager (handles timeouts and ordering)
    if (this.serviceManager) {
      await this.serviceManager.stopAll();
      this.serviceManager = null;
    }

    // Cleanup lifecycle listener
    if (this.lifecycleUnsubscribe) {
      this.lifecycleUnsubscribe();
      this.lifecycleUnsubscribe = null;
    }

    // Cleanup MCP client (not managed by ServiceManager yet)
    if (this.mcpClient) {
      this.mcpClient.disconnect();
      this.mcpClient = null;
    }

    // Cleanup calendar scheduler
    if (this.calendarSchedulerInterval) {
      clearInterval(this.calendarSchedulerInterval);
      this.calendarSchedulerInterval = null;
    }

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

    // Clear service references
    this.queueConsumer = null;
    this.eventService = null;
    this.slotManager = null;

    const unloadTime = Date.now() - unloadStart;
    console.log(`[Persona] Plugin unloaded in ${unloadTime}ms`);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Update services with new settings
    this.jobQueueService = new JobQueueService(this.settings);
    this.executionService = new ExecutionService(this.settings, this.jobQueueService);
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
        new JobQueueModal(this.app, this.jobQueueService, this.settings).open();
      });

      // Add instance change handler
      this.statusBar.setInstanceChangeHandler(async (instance: string) => {
        this.settings.business = instance;
        await this.saveSettings();
        this.statusBar?.updateBusiness(instance);
        new Notice(`Switched to instance: ${instance}`);
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

  /**
   * Initialize the queue consumer service for active job polling
   */
  private async initializeQueueConsumer() {
    // Create slot manager with configured max concurrent agents
    this.slotManager = new ExecutionSlotManager(this.settings.maxConcurrentAgents || 2);

    // Create event service for Realtime subscriptions
    this.eventService = new EventService(this.settings);

    // Create queue consumer
    this.queueConsumer = new QueueConsumerService(
      this.jobQueueService,
      this.executionService,
      this.slotManager,
      this.settings
    );

    // Wire up EventService to handle job status changes
    this.eventService.onJobChange((event, job, oldJob) => {
      this.handleJobEvent(event, job, oldJob);
    });

    // Register services with ServiceManager for unified lifecycle
    if (this.serviceManager) {
      // Register EventService (Supabase Realtime)
      this.serviceManager.register(createManagedService(
        'EventService',
        async () => {
          await this.eventService!.start();
        },
        async () => {
          await this.eventService!.stop();
        },
        async () => this.eventService!.isConnected()
      ));

      // Register QueueConsumer (polls for pending jobs)
      this.serviceManager.register(createManagedService(
        'QueueConsumer',
        async () => {
          await this.queueConsumer!.start();
        },
        async () => {
          this.queueConsumer!.stop();
        },
        async () => this.queueConsumer!.isRunning()
      ));
    }
  }

  /**
   * Handle job events from Supabase Realtime
   */
  private handleJobEvent(event: JobChangeEvent, job: any, oldJob?: any): void {
    // Update status bar with job status changes
    if (this.statusBar && event === 'job:updated') {
      // Detect status transitions
      if (oldJob && oldJob.status !== job.status) {
        console.log(`[Persona] Job ${job.shortId} status: ${oldJob.status} → ${job.status}`);

        // Update UI based on new status
        if (job.status === 'running') {
          this.statusBar.showAgentRunning(job.assignedTo || 'agent', job.shortId);
        } else if (job.status === 'completed') {
          this.statusBar.showAgentCompleted(job.assignedTo || 'agent');
          // Release slot when job completes
          if (this.slotManager) {
            this.slotManager.releaseSlotByJobId(job.shortId);
          }
        } else if (job.status === 'failed') {
          this.statusBar.showAgentFailed(job.assignedTo || 'agent', job.error);
          // Release slot when job fails
          if (this.slotManager) {
            this.slotManager.releaseSlotByJobId(job.shortId);
          }
        }
      }
    }

    // Log new job creations
    if (event === 'job:created') {
      console.log(`[Persona] New job created: ${job.shortId} (${job.type})`);
    }
  }

  /**
   * Update queue consumer when settings change
   */
  async updateQueueConsumer() {
    if (!this.queueConsumer) {
      await this.initializeQueueConsumer();
      return;
    }

    // Update settings on services
    this.queueConsumer.updateSettings(this.settings);
    if (this.eventService) {
      this.eventService.updateSettings(this.settings);
    }

    // Use ServiceManager for coordinated start/stop
    if (this.serviceManager) {
      if (this.settings.queueConsumerEnabled) {
        // Start all services if not already running
        const health = await this.serviceManager.checkHealth();
        const allHealthy = health.every(h => h.healthy);
        if (!allHealthy) {
          console.log('[Persona] Services not healthy, starting all...');
          await this.serviceManager.startAll();
        }
      } else {
        // Stop all services
        console.log('[Persona] Queue consumer disabled, stopping services...');
        await this.serviceManager.stopAll();
      }
    }
  }

  /**
   * Get queue consumer status (for UI)
   */
  getQueueConsumerStatus() {
    return this.queueConsumer?.getStatus() ?? null;
  }

  /**
   * Get health status of all managed services (for UI/debugging)
   */
  async getServiceHealth() {
    if (!this.serviceManager) {
      return [];
    }
    return this.serviceManager.checkHealth();
  }

  /**
   * Check if all services are ready and healthy
   */
  async isServicesReady(): Promise<boolean> {
    if (!this.serviceManager) {
      return false;
    }
    return this.serviceManager.isReady();
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

  /**
   * Initialize calendar-related services
   */
  private initializeCalendarServices() {
    // Create calendar logger
    this.calendarLogger = new CalendarLogger(this.settings);

    // Create MCP client
    this.mcpClient = new MCPClientService();

    // Create timezone resolver
    const timezoneResolver = new TimezoneResolver();

    // Create calendar fetch service
    this.calendarFetchService = new CalendarFetchService(
      this.mcpClient,
      this.calendarLogger,
      timezoneResolver,
      this.settings
    );

    // Create calendar job handler
    this.calendarJobHandler = new CalendarJobHandler(
      this.app,
      this.calendarFetchService,
      this.jobQueueService,
      this.calendarLogger,
      this.settings
    );

    // Wire up to queue consumer
    if (this.queueConsumer) {
      this.queueConsumer.setCalendarJobHandler(this.calendarJobHandler);
    }

    // Fetch on startup if enabled
    if (this.settings.mcp.ical.enabled && this.settings.calendar.fetchOnStartup) {
      // Delay to let Obsidian fully initialize
      setTimeout(() => this.fetchTodaysCalendar(), 5000);
    }

    // Setup daily auto-fetch scheduler
    this.setupCalendarScheduler();
  }

  /**
   * Setup scheduler for daily calendar fetching.
   * Checks every 15 minutes if we need to fetch today's calendar.
   */
  private setupCalendarScheduler() {
    // Clear existing interval
    if (this.calendarSchedulerInterval) {
      clearInterval(this.calendarSchedulerInterval);
    }

    if (!this.settings.mcp.ical.enabled || !this.settings.calendar.autoFetchDaily) {
      return;
    }

    // Check every 15 minutes
    const CHECK_INTERVAL_MS = 15 * 60 * 1000;

    this.calendarSchedulerInterval = setInterval(() => {
      this.checkAndFetchCalendar();
    }, CHECK_INTERVAL_MS);

    // Also check immediately (after a short delay)
    setTimeout(() => this.checkAndFetchCalendar(), 10000);
  }

  /**
   * Check if we need to fetch calendar for today and do so if needed.
   * Ensures idempotency - only fetches once per day.
   */
  private async checkAndFetchCalendar() {
    if (!this.settings.mcp.ical.enabled || !this.settings.calendar.autoFetchDaily) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Skip if already fetched today
    if (this.lastCalendarFetchDate === today) {
      return;
    }

    try {
      // Check if there's already a calendar job for today
      const pendingJobs = await this.jobQueueService.getPendingJobs('calendar');
      const runningJobs = await this.jobQueueService.getRunningJobs('calendar');

      const hasTodayJob = [...pendingJobs, ...runningJobs].some(job => {
        const jobDate = job.payload?.date || job.createdAt?.split('T')[0];
        return jobDate === today;
      });

      if (hasTodayJob) {
        // Already have a job for today, mark as fetched
        this.lastCalendarFetchDate = today;
        return;
      }

      // Create new calendar fetch job
      await this.fetchTodaysCalendar();
      this.lastCalendarFetchDate = today;
    } catch (err) {
      console.error('Calendar scheduler error:', err);
    }
  }

  /**
   * Test MCP connection (called from settings)
   */
  async testMCPConnection(): Promise<MCPHealthResult> {
    if (!this.mcpClient) {
      return {
        connected: false,
        serverName: 'ical',
        error: 'MCP client not initialized',
      };
    }

    const config = MCPClientService.configFromSettings(this.settings.mcp.ical);
    return this.mcpClient.testConnection();
  }

  /**
   * Fetch today's calendar events (creates a job)
   */
  async fetchTodaysCalendar(): Promise<void> {
    if (!this.settings.mcp.ical.enabled) {
      new Notice('Calendar integration not enabled');
      return;
    }

    try {
      const job = await this.jobQueueService.createCalendarFetchJob();
      new Notice(`Calendar job created: ${job.shortId}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      new Notice(`Failed to create calendar job: ${error}`);
      throw err;
    }
  }
}
