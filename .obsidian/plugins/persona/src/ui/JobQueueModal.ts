import { Modal, App, Notice } from 'obsidian';
import { JobQueueService, JobInfo, JobSummary } from '../services/JobQueueService';

export class JobQueueModal extends Modal {
  private jobQueueService: JobQueueService;
  private refreshInterval: number | null = null;
  private autoRefresh: boolean = true;

  constructor(app: App, jobQueueService: JobQueueService) {
    super(app);
    this.jobQueueService = jobQueueService;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('persona-job-queue-modal');

    // Header
    const header = contentEl.createDiv({ cls: 'job-queue-header' });
    header.createEl('h2', { text: 'Job Queue Dashboard' });

    // Controls
    const controls = contentEl.createDiv({ cls: 'job-queue-controls' });
    const refreshBtn = controls.createEl('button', { text: '🔄 Refresh' });
    refreshBtn.onclick = () => this.refresh();

    const autoRefreshToggle = controls.createEl('button', {
      text: this.autoRefresh ? '⏸️ Pause Auto-refresh' : '▶️ Resume Auto-refresh',
    });
    autoRefreshToggle.onclick = () => {
      this.autoRefresh = !this.autoRefresh;
      autoRefreshToggle.setText(
        this.autoRefresh ? '⏸️ Pause Auto-refresh' : '▶️ Resume Auto-refresh'
      );
      if (this.autoRefresh) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    };

    // Summary section
    const summaryContainer = contentEl.createDiv({ cls: 'job-queue-summary' });
    summaryContainer.createEl('h3', { text: 'Summary' });
    const summaryEl = summaryContainer.createDiv({ cls: 'summary-grid' });

    // Jobs section
    const jobsContainer = contentEl.createDiv({ cls: 'job-queue-jobs' });
    jobsContainer.createEl('h3', { text: 'Jobs' });

    // Tabs for different job states
    const tabs = jobsContainer.createDiv({ cls: 'job-queue-tabs' });
    const tabButtons = {
      running: tabs.createEl('button', { text: 'Running', cls: 'tab-button active' }),
      pending: tabs.createEl('button', { text: 'Pending', cls: 'tab-button' }),
      recent: tabs.createEl('button', { text: 'Recent', cls: 'tab-button' }),
    };

    const jobsListContainer = jobsContainer.createDiv({ cls: 'jobs-list-container' });

    // Tab click handlers
    let activeTab: 'running' | 'pending' | 'recent' = 'running';

    const switchTab = (tab: 'running' | 'pending' | 'recent') => {
      activeTab = tab;
      Object.values(tabButtons).forEach((btn) => btn.removeClass('active'));
      tabButtons[tab].addClass('active');
      this.renderJobs(jobsListContainer, tab);
    };

    tabButtons.running.onclick = () => switchTab('running');
    tabButtons.pending.onclick = () => switchTab('pending');
    tabButtons.recent.onclick = () => switchTab('recent');

    // Initial load
    await this.loadSummary(summaryEl);
    await this.renderJobs(jobsListContainer, activeTab);

    // Start auto-refresh
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  private async loadSummary(container: HTMLElement) {
    try {
      const summary = await this.jobQueueService.getJobSummary();
      this.renderSummary(container, summary);
    } catch (error) {
      container.setText(`Error loading summary: ${error.message}`);
    }
  }

  private renderSummary(container: HTMLElement, summary: JobSummary) {
    container.empty();

    const statuses = [
      { label: 'Pending', value: summary.pending, cls: 'pending' },
      { label: 'Running', value: summary.running, cls: 'running' },
      { label: 'Completed', value: summary.completed, cls: 'completed' },
      { label: 'Failed', value: summary.failed, cls: 'failed' },
      { label: 'Hung', value: summary.hung, cls: 'hung' },
    ];

    statuses.forEach((status) => {
      const card = container.createDiv({ cls: `summary-card ${status.cls}` });
      card.createDiv({ cls: 'summary-label', text: status.label });
      card.createDiv({ cls: 'summary-value', text: String(status.value) });
    });
  }

  private async renderJobs(
    container: HTMLElement,
    type: 'running' | 'pending' | 'recent'
  ) {
    container.empty();
    container.createDiv({ cls: 'loading', text: 'Loading jobs...' });

    try {
      let jobs: JobInfo[] = [];

      if (type === 'running') {
        jobs = await this.jobQueueService.getRunningJobs();
      } else if (type === 'pending') {
        jobs = await this.jobQueueService.getPendingJobs();
      } else {
        // For recent, we'll need to get completed jobs
        // This would require adding a method to JobQueueService
        // For now, show a message
        container.empty();
        container.createDiv({
          cls: 'no-jobs',
          text: 'Recent jobs view coming soon',
        });
        return;
      }

      container.empty();

      if (jobs.length === 0) {
        container.createDiv({ cls: 'no-jobs', text: `No ${type} jobs` });
        return;
      }

      const jobsList = container.createDiv({ cls: 'jobs-list' });

      jobs.forEach((job) => {
        const jobCard = jobsList.createDiv({ cls: 'job-card' });

        // Header row
        const header = jobCard.createDiv({ cls: 'job-header' });
        header.createSpan({ cls: 'job-id', text: job.shortId });
        header.createSpan({ cls: 'job-type', text: job.type });

        if (job.status) {
          header.createSpan({ cls: `job-status ${job.status}`, text: job.status });
        }

        // Details
        const details = jobCard.createDiv({ cls: 'job-details' });

        if (job.assignedTo) {
          details.createDiv({ text: `Agent: ${job.assignedTo}` });
        }

        if (job.pid) {
          details.createDiv({ text: `PID: ${job.pid}` });
        }

        if (job.createdAt) {
          const created = new Date(job.createdAt);
          details.createDiv({
            text: `Created: ${this.formatDate(created)}`,
          });
        }

        if (job.startedAt) {
          const started = new Date(job.startedAt);
          details.createDiv({
            text: `Started: ${this.formatDate(started)}`,
          });
        }

        if (job.error) {
          const errorEl = details.createDiv({ cls: 'job-error' });
          errorEl.createSpan({ text: 'Error: ' });
          errorEl.createSpan({ cls: 'error-message', text: job.error });
        }

        // Actions
        const actions = jobCard.createDiv({ cls: 'job-actions' });

        const viewLogsBtn = actions.createEl('button', {
          text: '📋 Logs',
          cls: 'job-action-btn',
        });
        viewLogsBtn.onclick = () => this.viewJobLogs(job);

        if (job.status === 'running') {
          const killBtn = actions.createEl('button', {
            text: '🛑 Kill',
            cls: 'job-action-btn danger',
          });
          killBtn.onclick = () => this.killJob(job);
        }
      });
    } catch (error) {
      container.empty();
      container.createDiv({
        cls: 'error',
        text: `Error loading jobs: ${error.message}`,
      });
    }
  }

  private async viewJobLogs(job: JobInfo) {
    try {
      const logs = await this.jobQueueService.getJobLogs(job.shortId, 50);

      // Create a new modal for logs
      const logsModal = new Modal(this.app);
      logsModal.titleEl.setText(`Logs: ${job.shortId}`);

      const { contentEl } = logsModal;
      contentEl.addClass('persona-job-logs-modal');

      if (logs.length === 0) {
        contentEl.createDiv({ text: 'No logs available' });
      } else {
        const logsList = contentEl.createDiv({ cls: 'logs-list' });

        logs.forEach((log) => {
          const logEntry = logsList.createDiv({ cls: `log-entry ${log.level}` });

          const timestamp = new Date(log.timestamp);
          logEntry.createSpan({
            cls: 'log-timestamp',
            text: this.formatTime(timestamp),
          });

          logEntry.createSpan({
            cls: 'log-level',
            text: log.level.toUpperCase(),
          });

          logEntry.createSpan({
            cls: 'log-message',
            text: log.message,
          });
        });
      }

      logsModal.open();
    } catch (error) {
      new Notice(`Error loading logs: ${error.message}`);
    }
  }

  private async killJob(job: JobInfo) {
    // This would require adding a kill method to JobQueueService
    // For now, show a notice
    new Notice(`Kill job ${job.shortId} - Not yet implemented`);
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString();
  }

  private async refresh() {
    const summaryEl = this.contentEl.querySelector('.summary-grid') as HTMLElement;
    const jobsListContainer = this.contentEl.querySelector(
      '.jobs-list-container'
    ) as HTMLElement;

    if (summaryEl) {
      await this.loadSummary(summaryEl);
    }

    if (jobsListContainer) {
      const activeTab = this.contentEl.querySelector('.tab-button.active');
      let type: 'running' | 'pending' | 'recent' = 'running';

      if (activeTab?.textContent?.includes('Pending')) {
        type = 'pending';
      } else if (activeTab?.textContent?.includes('Recent')) {
        type = 'recent';
      }

      await this.renderJobs(jobsListContainer, type);
    }
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshInterval = window.setInterval(() => {
      if (this.autoRefresh) {
        this.refresh();
      }
    }, 5000); // Refresh every 5 seconds
  }

  private stopAutoRefresh() {
    if (this.refreshInterval !== null) {
      window.clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  onClose() {
    this.stopAutoRefresh();
    const { contentEl } = this;
    contentEl.empty();
  }
}
