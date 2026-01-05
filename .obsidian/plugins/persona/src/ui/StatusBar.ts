import { PersonaSettings, ProgressState } from '../types';

export class StatusBarManager {
  private statusBarEl: HTMLElement;
  private settings: PersonaSettings;
  private onClickCallback: ((event: MouseEvent) => void) | null = null;

  constructor(statusBar: HTMLElement, settings: PersonaSettings) {
    this.statusBarEl = statusBar;
    this.settings = settings;
    this.statusBarEl.addClass('persona-status-bar');
    this.statusBarEl.style.cursor = 'pointer';
    this.statusBarEl.addEventListener('click', (event) => {
      this.onClickCallback?.(event);
    });
    this.setReady();
  }

  setClickHandler(callback: (event: MouseEvent) => void) {
    this.onClickCallback = callback;
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
