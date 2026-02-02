import { App, Modal, Setting, setIcon } from 'obsidian';
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

    // Header with icon
    const header = contentEl.createDiv({ cls: 'ar-header' });
    const headerLeft = header.createDiv({ cls: 'ar-header-left' });
    const headerIcon = headerLeft.createSpan({ cls: 'ar-header-icon' });
    setIcon(headerIcon, 'bot');
    const headerText = headerLeft.createDiv({ cls: 'ar-header-text' });
    headerText.createEl('h2', { text: 'Agent Runner' });
    headerText.createSpan({ text: this.plugin.settings.business, cls: 'ar-instance-badge' });

    // Running agents section
    const runningSection = contentEl.createDiv({ cls: 'ar-running-section' });
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
    const agentsContainer = contentEl.createDiv({ cls: 'ar-agents-container' });
    this.renderAgentList(agentsContainer);

    // Selected agent display and run button
    const actionBar = contentEl.createDiv({ cls: 'ar-action-bar' });

    const selectedDiv = actionBar.createDiv({ cls: 'ar-selected' });
    selectedDiv.id = 'persona-selected-display';
    const selectIcon = selectedDiv.createSpan({ cls: 'ar-select-icon' });
    setIcon(selectIcon, 'mouse-pointer-click');
    selectedDiv.createSpan({ text: 'Select an agent action', cls: 'ar-select-text' });

    const actionButtons = actionBar.createDiv({ cls: 'ar-action-buttons' });

    const runBtn = actionButtons.createEl('button', { cls: 'ar-btn ar-btn-primary' });
    const runIcon = runBtn.createSpan({ cls: 'ar-btn-icon' });
    setIcon(runIcon, 'play');
    runBtn.createSpan({ text: 'Run Agent' });
    runBtn.onclick = () => this.runSelected();

    const cancelBtn = actionButtons.createEl('button', { cls: 'ar-btn' });
    cancelBtn.createSpan({ text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    // Settings section (collapsible)
    const settingsSection = contentEl.createDiv({ cls: 'ar-settings-section' });
    const settingsHeader = settingsSection.createDiv({ cls: 'ar-settings-header' });
    const settingsToggle = settingsHeader.createSpan({ cls: 'ar-settings-toggle' });
    setIcon(settingsToggle, 'chevron-down');
    settingsHeader.createSpan({ text: 'Settings', cls: 'ar-settings-title' });

    const settingsContent = settingsSection.createDiv({ cls: 'ar-settings-content' });

    // Toggle settings visibility
    let settingsExpanded = false;
    settingsHeader.onclick = () => {
      settingsExpanded = !settingsExpanded;
      settingsContent.classList.toggle('expanded', settingsExpanded);
      settingsToggle.empty();
      setIcon(settingsToggle, settingsExpanded ? 'chevron-up' : 'chevron-down');
    };

    // Open Logs button
    const logsRow = settingsContent.createDiv({ cls: 'ar-setting-row' });
    const logsInfo = logsRow.createDiv({ cls: 'ar-setting-info' });
    const logsIcon = logsInfo.createSpan({ cls: 'ar-setting-icon' });
    setIcon(logsIcon, 'folder-open');
    const logsText = logsInfo.createDiv();
    logsText.createDiv({ text: 'Agent Logs', cls: 'ar-setting-name' });
    logsText.createDiv({ text: 'View execution logs for debugging', cls: 'ar-setting-desc' });
    const logsBtn = logsRow.createEl('button', { cls: 'ar-btn ar-btn-small' });
    const logsBtnIcon = logsBtn.createSpan({ cls: 'ar-btn-icon' });
    setIcon(logsBtnIcon, 'external-link');
    logsBtn.createSpan({ text: 'Open' });
    logsBtn.onclick = () => {
      const logsPath = path.join(
        this.plugin.settings.personaRoot,
        'instances',
        this.plugin.settings.business,
        'logs',
        'agents'
      );
      require('electron').shell.openPath(logsPath);
    };

    // Polling interval setting
    const pollingRow = settingsContent.createDiv({ cls: 'ar-setting-row' });
    const pollingInfo = pollingRow.createDiv({ cls: 'ar-setting-info' });
    const pollingIcon = pollingInfo.createSpan({ cls: 'ar-setting-icon' });
    setIcon(pollingIcon, 'timer');
    const pollingText = pollingInfo.createDiv();
    pollingText.createDiv({ text: 'Auto-process interval', cls: 'ar-setting-name' });
    pollingText.createDiv({ text: 'Check for research questions', cls: 'ar-setting-desc' });
    const pollingSelect = pollingRow.createEl('select', { cls: 'ar-select' });
    const pollingOptions = [
      { value: '0', label: 'Disabled' },
      { value: '5', label: '5 min' },
      { value: '10', label: '10 min' },
      { value: '15', label: '15 min' },
      { value: '30', label: '30 min' },
      { value: '60', label: '1 hour' },
    ];
    pollingOptions.forEach(opt => {
      pollingSelect.createEl('option', { value: opt.value, text: opt.label });
    });
    pollingSelect.value = this.plugin.settings.pollingEnabled
      ? String(this.plugin.settings.pollingIntervalMinutes)
      : '0';
    pollingSelect.onchange = async () => {
      const value = pollingSelect.value;
      if (value === '0') {
        this.plugin.settings.pollingEnabled = false;
      } else {
        this.plugin.settings.pollingEnabled = true;
        this.plugin.settings.pollingIntervalMinutes = parseInt(value);
      }
      await this.plugin.saveSettings();
      this.plugin.updatePolling();
    };

    // Auto-process on save toggle
    const saveRow = settingsContent.createDiv({ cls: 'ar-setting-row' });
    const saveInfo = saveRow.createDiv({ cls: 'ar-setting-info' });
    const saveIcon = saveInfo.createSpan({ cls: 'ar-setting-icon' });
    setIcon(saveIcon, 'save');
    const saveText = saveInfo.createDiv();
    saveText.createDiv({ text: 'Process on save', cls: 'ar-setting-name' });
    saveText.createDiv({ text: 'Auto-process when daily note saved', cls: 'ar-setting-desc' });
    const saveToggle = saveRow.createEl('button', {
      cls: `ar-toggle ${this.plugin.settings.autoProcessOnSave ? 'active' : ''}`
    });
    const toggleKnob = saveToggle.createDiv({ cls: 'ar-toggle-knob' });
    saveToggle.onclick = async () => {
      this.plugin.settings.autoProcessOnSave = !this.plugin.settings.autoProcessOnSave;
      saveToggle.classList.toggle('active', this.plugin.settings.autoProcessOnSave);
      await this.plugin.saveSettings();
      this.plugin.updateFileWatcher();
    };
  }

  private renderRunningAgents(container: HTMLElement) {
    container.empty();
    const running = this.plugin.executionService.getRunningExecutions();

    if (running.length === 0) {
      container.addClass('ar-running-empty');
      container.removeClass('ar-running-active');
      const emptyState = container.createDiv({ cls: 'ar-running-empty-state' });
      const emptyIcon = emptyState.createSpan({ cls: 'ar-running-empty-icon' });
      setIcon(emptyIcon, 'circle-dot');
      emptyState.createSpan({ text: 'No agents running', cls: 'ar-running-empty-text' });
    } else {
      container.removeClass('ar-running-empty');
      container.addClass('ar-running-active');

      // Header with count
      const header = container.createDiv({ cls: 'ar-running-header' });
      header.createSpan({ cls: 'ar-pulse-dot' });
      header.createSpan({ text: `${running.length} agent${running.length > 1 ? 's' : ''} running`, cls: 'ar-running-count' });

      // List running agents
      const list = container.createDiv({ cls: 'ar-running-list' });
      for (const exec of running) {
        const item = list.createDiv({ cls: 'ar-running-item' });
        const itemIcon = item.createSpan({ cls: 'ar-running-item-icon' });
        setIcon(itemIcon, 'bot');
        const itemText = item.createDiv({ cls: 'ar-running-item-text' });
        itemText.createSpan({ text: exec.agent, cls: 'ar-running-agent' });
        itemText.createSpan({ text: exec.action, cls: 'ar-running-action' });
        const elapsed = Math.round((Date.now() - exec.startTime.getTime()) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const timeText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        item.createSpan({ text: timeText, cls: 'ar-running-time' });
      }
    }
  }

  private renderAgentList(container: HTMLElement) {
    // Group agents by tier
    const tiers = ['executive', 'management', 'specialist', 'support'] as const;
    const tierConfig: Record<string, { label: string; icon: string; color: string }> = {
      executive: { label: 'Executive', icon: 'crown', color: '#ffc107' },
      management: { label: 'Management', icon: 'users', color: '#2196f3' },
      specialist: { label: 'Specialist', icon: 'wrench', color: '#4caf50' },
      support: { label: 'Support', icon: 'help-circle', color: '#9c27b0' },
    };

    for (const tier of tiers) {
      const tierAgents = MHM_AGENTS.filter((a) => a.tier === tier);
      if (tierAgents.length === 0) continue;

      const config = tierConfig[tier];
      const tierSection = container.createDiv({ cls: `ar-tier-section ar-tier-${tier}` });

      const tierHeader = tierSection.createDiv({ cls: 'ar-tier-header' });
      const tierIcon = tierHeader.createSpan({ cls: 'ar-tier-icon' });
      setIcon(tierIcon, config.icon);
      tierHeader.createSpan({ text: config.label, cls: 'ar-tier-label' });
      tierHeader.createSpan({ text: `${tierAgents.length}`, cls: 'ar-tier-count' });

      const agentList = tierSection.createDiv({ cls: 'ar-agent-list' });

      for (const agent of tierAgents) {
        this.renderAgentCard(agentList, agent);
      }
    }
  }

  private renderAgentCard(container: HTMLElement, agent: AgentDefinition) {
    const card = container.createDiv({ cls: 'ar-agent-card' });

    const header = card.createDiv({ cls: 'ar-agent-header' });
    const agentIcon = header.createSpan({ cls: 'ar-agent-icon' });
    setIcon(agentIcon, 'bot');
    const headerText = header.createDiv({ cls: 'ar-agent-header-text' });
    headerText.createSpan({ text: agent.name, cls: 'ar-agent-name' });
    headerText.createSpan({ text: agent.role, cls: 'ar-agent-role' });

    const actionsDiv = card.createDiv({ cls: 'ar-agent-actions' });

    for (const action of agent.actions) {
      const btn = actionsDiv.createEl('button', { cls: 'ar-action-btn' });
      const btnIcon = btn.createSpan({ cls: 'ar-action-icon' });
      setIcon(btnIcon, 'play');
      btn.createSpan({ text: action });

      btn.addEventListener('click', () => {
        // Clear previous selection
        container.parentElement?.querySelectorAll('.ar-action-btn.selected').forEach((el) => {
          el.removeClass('selected');
        });

        // Set new selection
        btn.addClass('selected');
        this.selectedAgent = agent.name;
        this.selectedAction = action;

        // Update display
        const display = document.getElementById('persona-selected-display');
        if (display) {
          display.empty();
          display.addClass('has-selection');
          const checkIcon = display.createSpan({ cls: 'ar-select-icon' });
          setIcon(checkIcon, 'check-circle');
          const selectText = display.createSpan({ cls: 'ar-select-text' });
          selectText.createSpan({ text: agent.name, cls: 'ar-select-agent' });
          selectText.createSpan({ text: ' → ' });
          selectText.createSpan({ text: action, cls: 'ar-select-action' });
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
