import { PersonaSettings, ProgressState } from '../types';
import { setIcon } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

export class StatusBarManager {
  private statusBarEl: HTMLElement;
  private settings: PersonaSettings;
  private onClickCallback: ((event: MouseEvent) => void) | null = null;
  private onViewQueueCallback: (() => void) | null = null;
  private onInstanceChangeCallback: ((instance: string) => void) | null = null;
  private dropdownEl: HTMLElement | null = null;
  private isDropdownOpen = false;

  constructor(statusBar: HTMLElement, settings: PersonaSettings) {
    this.statusBarEl = statusBar;
    this.settings = settings;
    this.statusBarEl.addClass('persona-status-bar');
    this.statusBarEl.style.cursor = 'pointer';
    this.statusBarEl.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleDropdown(event);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isDropdownOpen && !this.dropdownEl?.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    this.setReady();
  }

  setClickHandler(callback: (event: MouseEvent) => void) {
    this.onClickCallback = callback;
  }

  setViewQueueHandler(callback: () => void) {
    this.onViewQueueCallback = callback;
  }

  setInstanceChangeHandler(callback: (instance: string) => void) {
    this.onInstanceChangeCallback = callback;
  }

  private getAvailableInstances(): string[] {
    const instancesPath = path.join(this.settings.personaRoot, 'instances');
    try {
      const entries = fs.readdirSync(instancesPath, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => e.name);
    } catch {
      return [this.settings.business];
    }
  }

  private toggleDropdown(event: MouseEvent) {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.showDropdown(event);
    }
  }

  private showDropdown(event: MouseEvent) {
    // Close any existing dropdown
    this.closeDropdown();

    // Create dropdown container
    this.dropdownEl = document.createElement('div');
    this.dropdownEl.addClass('persona-dropdown');

    // Header with logo/title
    const header = this.dropdownEl.createDiv({ cls: 'persona-dropdown-header' });
    const headerIcon = header.createSpan({ cls: 'persona-dropdown-header-icon' });
    setIcon(headerIcon, 'bot');
    header.createSpan({ text: 'Persona', cls: 'persona-dropdown-header-title' });

    // Instance selector (clickable)
    const instanceBadge = header.createDiv({ cls: 'persona-dropdown-instance-selector' });
    instanceBadge.createSpan({ text: this.settings.business, cls: 'persona-dropdown-instance-name' });
    const chevron = instanceBadge.createSpan({ cls: 'persona-dropdown-instance-chevron' });
    setIcon(chevron, 'chevron-down');

    // Instance dropdown submenu
    let instanceMenuVisible = false;
    const instanceMenu = this.dropdownEl.createDiv({ cls: 'persona-instance-menu' });

    const instances = this.getAvailableInstances();
    instances.forEach(instance => {
      const item = instanceMenu.createDiv({
        cls: `persona-instance-item ${instance === this.settings.business ? 'active' : ''}`
      });
      const itemIcon = item.createSpan({ cls: 'persona-instance-item-icon' });
      setIcon(itemIcon, instance === this.settings.business ? 'check' : 'folder');
      item.createSpan({ text: instance });

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (instance !== this.settings.business && this.onInstanceChangeCallback) {
          this.onInstanceChangeCallback(instance);
          this.closeDropdown();
        }
      });
    });

    instanceBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      instanceMenuVisible = !instanceMenuVisible;
      instanceMenu.classList.toggle('visible', instanceMenuVisible);
      chevron.empty();
      setIcon(chevron, instanceMenuVisible ? 'chevron-up' : 'chevron-down');
    });

    // Menu items
    const menuItems = this.dropdownEl.createDiv({ cls: 'persona-dropdown-menu' });

    // Run Agent item
    const runAgentItem = menuItems.createDiv({ cls: 'persona-dropdown-item' });
    runAgentItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeDropdown();
      if (this.onClickCallback) {
        this.onClickCallback(event);
      }
    });
    const runIcon = runAgentItem.createSpan({ cls: 'persona-dropdown-item-icon' });
    setIcon(runIcon, 'play-circle');
    const runContent = runAgentItem.createDiv({ cls: 'persona-dropdown-item-content' });
    runContent.createSpan({ text: 'Run Agent', cls: 'persona-dropdown-item-title' });
    runContent.createSpan({ text: 'Execute an agent action', cls: 'persona-dropdown-item-desc' });

    // View Queue item
    const viewQueueItem = menuItems.createDiv({ cls: 'persona-dropdown-item' });
    viewQueueItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeDropdown();
      if (this.onViewQueueCallback) {
        this.onViewQueueCallback();
      }
    });
    const queueIcon = viewQueueItem.createSpan({ cls: 'persona-dropdown-item-icon' });
    setIcon(queueIcon, 'list-ordered');
    const queueContent = viewQueueItem.createDiv({ cls: 'persona-dropdown-item-content' });
    queueContent.createSpan({ text: 'View Queue', cls: 'persona-dropdown-item-title' });
    queueContent.createSpan({ text: 'Job queue dashboard', cls: 'persona-dropdown-item-desc' });

    // Separator
    menuItems.createDiv({ cls: 'persona-dropdown-separator' });

    // Settings item
    const settingsItem = menuItems.createDiv({ cls: 'persona-dropdown-item persona-dropdown-item-secondary' });
    settingsItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeDropdown();
      // Open plugin settings (use Obsidian command)
      (window as any).app?.setting?.open();
      (window as any).app?.setting?.openTabById('persona');
    });
    const settingsIcon = settingsItem.createSpan({ cls: 'persona-dropdown-item-icon' });
    setIcon(settingsIcon, 'settings');
    settingsItem.createSpan({ text: 'Settings', cls: 'persona-dropdown-item-title' });

    // Position dropdown above the status bar
    const rect = this.statusBarEl.getBoundingClientRect();
    this.dropdownEl.style.position = 'fixed';
    this.dropdownEl.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    this.dropdownEl.style.right = `${window.innerWidth - rect.right}px`;

    document.body.appendChild(this.dropdownEl);
    this.isDropdownOpen = true;

    // Animate in
    requestAnimationFrame(() => {
      this.dropdownEl?.addClass('persona-dropdown-visible');
    });
  }

  private closeDropdown() {
    if (this.dropdownEl) {
      this.dropdownEl.removeClass('persona-dropdown-visible');
      // Wait for animation to complete
      setTimeout(() => {
        this.dropdownEl?.remove();
        this.dropdownEl = null;
      }, 150);
    }
    this.isDropdownOpen = false;
  }

  setReady() {
    this.statusBarEl.setText(`Persona: ${this.settings.business}`);
    this.statusBarEl.removeClass('persona-status-running');
    this.statusBarEl.removeClass('persona-status-error');
  }

  setRunning(agent: string, action?: string) {
    this.statusBarEl.empty();
    this.statusBarEl.addClass('persona-status-running');

    // Add spinning indicator
    const spinner = this.statusBarEl.createSpan({ cls: 'persona-spinner' });

    // Add agent name
    this.statusBarEl.createSpan({ text: ` ${agent}` });

    // Add action if provided
    if (action) {
      this.statusBarEl.createSpan({ text: `: ${action}`, cls: 'persona-action' });
    }
  }

  /**
   * Update status bar with progress information
   */
  setProgress(progress: ProgressState, elapsed: string) {
    this.statusBarEl.empty();
    this.statusBarEl.addClass('persona-status-running');

    // Add spinning indicator
    this.statusBarEl.createSpan({ cls: 'persona-spinner' });

    // Build progress text: "researcher: 0/5 questions (1m 23s)"
    const agentText = ` ${progress.agent}`;
    this.statusBarEl.createSpan({ text: agentText });

    // Add question progress if available
    if (progress.questions_total > 0) {
      const progressText = `: ${progress.questions_completed}/${progress.questions_total} questions`;
      this.statusBarEl.createSpan({ text: progressText, cls: 'persona-progress' });
    } else if (progress.current_activity) {
      this.statusBarEl.createSpan({
        text: `: ${progress.current_activity}`,
        cls: 'persona-activity',
      });
    }

    // Add elapsed time
    if (elapsed) {
      this.statusBarEl.createSpan({ text: ` (${elapsed})`, cls: 'persona-elapsed' });
    }
  }

  setError(message: string) {
    this.statusBarEl.setText(`Persona: Error`);
    this.statusBarEl.addClass('persona-status-error');
  }

  updateBusiness(business: string) {
    this.settings.business = business;
    this.setReady();
  }
}
