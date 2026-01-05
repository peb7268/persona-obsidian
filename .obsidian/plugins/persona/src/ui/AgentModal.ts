import { App, Modal, Setting } from 'obsidian';
import type PersonaPlugin from '../main';
import { AgentDefinition, MHM_AGENTS } from '../types';
import * as path from 'path';

export class AgentModal extends Modal {
  plugin: PersonaPlugin;
  private selectedAgent: string | null = null;
  private selectedAction: string | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(app: App, plugin: PersonaPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('persona-modal');

    // Header
    contentEl.createEl('h2', { text: 'Persona Agent Runner' });

    // Instance indicator
    const instanceInfo = contentEl.createDiv({ cls: 'persona-instance-info' });
    instanceInfo.createEl('span', { text: `Instance: ` });
    instanceInfo.createEl('strong', { text: this.plugin.settings.business });

    // Running agents section
    const runningSection = contentEl.createDiv({ cls: 'persona-running-section' });
    runningSection.id = 'persona-running-agents';
    this.renderRunningAgents(runningSection);

    // Set up auto-refresh for running agents (every 2 seconds)
    this.refreshInterval = setInterval(() => {
      const section = document.getElementById('persona-running-agents');
      if (section) {
        this.renderRunningAgents(section);
      }
    }, 2000);

    // Agent list by tier
    this.renderAgentList(contentEl);

    // Selected agent display
    const selectedDiv = contentEl.createDiv({ cls: 'persona-selected' });
    selectedDiv.id = 'persona-selected-display';
    selectedDiv.setText('Select an agent and action above');

    // Run button
    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('Run Agent')
          .setCta()
          .onClick(() => this.runSelected())
      )
      .addButton((btn) =>
        btn.setButtonText('Cancel').onClick(() => this.close())
      );

    // Separator
    contentEl.createEl('hr', { cls: 'persona-modal-divider' });

    // Settings section
    const settingsSection = contentEl.createDiv({ cls: 'persona-modal-settings' });
    settingsSection.createEl('h4', { text: 'Settings' });

    // Open Logs button
    new Setting(settingsSection)
      .setName('Agent Logs')
      .setDesc('View execution logs for debugging')
      .addButton((btn) =>
        btn
          .setButtonText('Open Logs Folder')
          .onClick(() => {
            const logsPath = path.join(
              this.plugin.settings.personaRoot,
              'instances',
              this.plugin.settings.business,
              'logs',
              'agents'
            );
            require('electron').shell.openPath(logsPath);
          })
      );

    // Polling interval setting
    new Setting(settingsSection)
      .setName('Auto-process interval')
      .setDesc('How often to check for research questions')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('0', 'Disabled')
          .addOption('5', '5 minutes')
          .addOption('10', '10 minutes')
          .addOption('15', '15 minutes')
          .addOption('30', '30 minutes')
          .addOption('60', '1 hour')
          .setValue(
            this.plugin.settings.pollingEnabled
              ? String(this.plugin.settings.pollingIntervalMinutes)
              : '0'
          )
          .onChange(async (value) => {
            if (value === '0') {
              this.plugin.settings.pollingEnabled = false;
            } else {
              this.plugin.settings.pollingEnabled = true;
              this.plugin.settings.pollingIntervalMinutes = parseInt(value);
            }
            await this.plugin.saveSettings();
            this.plugin.updatePolling();
          })
      );

    // Auto-process on save toggle
    new Setting(settingsSection)
      .setName('Process on save')
      .setDesc('Auto-process questions when daily note is saved')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoProcessOnSave)
          .onChange(async (value) => {
            this.plugin.settings.autoProcessOnSave = value;
            await this.plugin.saveSettings();
            this.plugin.updateFileWatcher();
          })
      );
  }

  private renderRunningAgents(container: HTMLElement) {
    container.empty();
    const running = this.plugin.executionService.getRunningExecutions();

    if (running.length === 0) {
      container.addClass('persona-running-empty');
      container.removeClass('persona-running-active');
      container.createEl('span', { text: 'No agents running', cls: 'persona-running-none' });
    } else {
      container.removeClass('persona-running-empty');
      container.addClass('persona-running-active');

      // Header with count
      const header = container.createDiv({ cls: 'persona-running-header' });
      header.createSpan({ cls: 'persona-spinner' });
      header.createSpan({ text: `${running.length} agent${running.length > 1 ? 's' : ''} running` });

      // List running agents
      const list = container.createDiv({ cls: 'persona-running-list' });
      for (const exec of running) {
        const item = list.createDiv({ cls: 'persona-running-item' });
        const elapsed = Math.round((Date.now() - exec.startTime.getTime()) / 1000);
        item.createSpan({ text: `${exec.agent}`, cls: 'persona-running-agent' });
        item.createSpan({ text: `: ${exec.action}`, cls: 'persona-running-action' });
        item.createSpan({ text: ` (${elapsed}s)`, cls: 'persona-running-time' });
      }
    }
  }

  private renderAgentList(container: HTMLElement) {
    // Group agents by tier
    const tiers = ['executive', 'management', 'specialist', 'support'] as const;
    const tierLabels: Record<string, string> = {
      executive: 'Executive',
      management: 'Management',
      specialist: 'Specialist',
      support: 'Support',
    };

    for (const tier of tiers) {
      const tierAgents = MHM_AGENTS.filter((a) => a.tier === tier);
      if (tierAgents.length === 0) continue;

      const tierSection = container.createDiv({ cls: 'persona-tier-section' });
      tierSection.createEl('h3', { text: tierLabels[tier] });

      const agentList = tierSection.createDiv({ cls: 'persona-agent-list' });

      for (const agent of tierAgents) {
        this.renderAgentCard(agentList, agent);
      }
    }
  }

  private renderAgentCard(container: HTMLElement, agent: AgentDefinition) {
    const card = container.createDiv({ cls: 'persona-agent-card' });

    const header = card.createDiv({ cls: 'persona-agent-header' });
    header.createEl('strong', { text: agent.name });
    header.createEl('span', { text: ` - ${agent.role}`, cls: 'persona-agent-role' });

    const actionsDiv = card.createDiv({ cls: 'persona-agent-actions' });

    for (const action of agent.actions) {
      const btn = actionsDiv.createEl('button', {
        text: action,
        cls: 'persona-action-btn',
      });

      btn.addEventListener('click', () => {
        // Clear previous selection
        container.parentElement?.querySelectorAll('.persona-action-btn.selected').forEach((el) => {
          el.removeClass('selected');
        });

        // Set new selection
        btn.addClass('selected');
        this.selectedAgent = agent.name;
        this.selectedAction = action;

        // Update display
        const display = document.getElementById('persona-selected-display');
        if (display) {
          display.setText(`Selected: ${agent.name} → ${action}`);
          display.addClass('has-selection');
        }
      });
    }
  }

  private async runSelected() {
    if (!this.selectedAgent || !this.selectedAction) {
      return;
    }

    this.close();

    // Update status bar if available
    if (this.plugin.statusBar) {
      this.plugin.statusBar.setRunning(this.selectedAgent);
    }

    await this.plugin.executionService.runAgent(
      this.selectedAgent,
      this.selectedAction
    );

    // Reset status bar
    if (this.plugin.statusBar) {
      this.plugin.statusBar.setReady();
    }
  }

  onClose() {
    // Clean up refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    const { contentEl } = this;
    contentEl.empty();
  }
}
