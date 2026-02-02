import { Modal, App, Notice, setIcon } from 'obsidian';
import { JobQueueService, JobInfo, JobSummary } from '../services/JobQueueService';
import { PersonaSettings } from '../types';

type FilterType = 'pending' | 'running' | 'completed' | 'failed' | 'hung';

export class JobQueueModal extends Modal {
  private jobQueueService: JobQueueService;
  private settings: PersonaSettings;
  private refreshInterval: number | null = null;
  private autoRefresh: boolean = true;
  private autoRefreshIndicator: HTMLElement | null = null;
  private activeFilter: FilterType = 'running';
  private jobsListContainer: HTMLElement | null = null;
  private summaryContainer: HTMLElement | null = null;

  constructor(app: App, jobQueueService: JobQueueService, settings: PersonaSettings) {
    super(app);
    this.jobQueueService = jobQueueService;
    this.settings = settings;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('persona-job-queue-modal');

    // Header with icon and title
    const header = contentEl.createDiv({ cls: 'jq-header' });
    const headerLeft = header.createDiv({ cls: 'jq-header-left' });
    const headerIcon = headerLeft.createSpan({ cls: 'jq-header-icon' });
    setIcon(headerIcon, 'activity');
    headerLeft.createEl('h2', { text: 'Job Queue' });

    // Auto-refresh indicator
    this.autoRefreshIndicator = header.createDiv({ cls: 'jq-auto-refresh' });
    this.updateAutoRefreshIndicator();

    // Controls
    const controls = header.createDiv({ cls: 'jq-controls' });

    const refreshBtn = controls.createEl('button', { cls: 'jq-btn jq-btn-icon' });
    const refreshIcon = refreshBtn.createSpan();
    setIcon(refreshIcon, 'refresh-cw');
    refreshBtn.onclick = () => this.refresh();

    const autoRefreshBtn = controls.createEl('button', { cls: 'jq-btn' });
    const autoIcon = autoRefreshBtn.createSpan({ cls: 'jq-btn-icon-inline' });
    setIcon(autoIcon, this.autoRefresh ? 'pause' : 'play');
    autoRefreshBtn.createSpan({ text: this.autoRefresh ? 'Pause' : 'Resume' });
    autoRefreshBtn.onclick = () => {
      this.autoRefresh = !this.autoRefresh;
      autoIcon.empty();
      setIcon(autoIcon, this.autoRefresh ? 'pause' : 'play');
      autoRefreshBtn.querySelector('span:last-child')!.textContent = this.autoRefresh ? 'Pause' : 'Resume';
      this.updateAutoRefreshIndicator();
      if (this.autoRefresh) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    };

    // Summary section (clickable stat cards act as filters)
    this.summaryContainer = contentEl.createDiv({ cls: 'jq-summary-grid' });

    // Jobs section
    const jobsContainer = contentEl.createDiv({ cls: 'jq-jobs-section' });
    this.jobsListContainer = jobsContainer.createDiv({ cls: 'jq-jobs-list' });

    // Initial load
    await this.loadSummary(this.summaryContainer);
    await this.renderJobs(this.jobsListContainer, this.activeFilter);

    // Start auto-refresh
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  private updateAutoRefreshIndicator() {
    if (!this.autoRefreshIndicator) return;
    this.autoRefreshIndicator.empty();
    if (this.autoRefresh) {
      const dot = this.autoRefreshIndicator.createSpan({ cls: 'jq-pulse-dot' });
      this.autoRefreshIndicator.createSpan({ text: 'Live', cls: 'jq-live-text' });
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

    const statuses: Array<{ label: string; value: number; filter: FilterType; icon: string }> = [
      { label: 'Pending', value: summary.pending, filter: 'pending', icon: 'clock' },
      { label: 'Running', value: summary.running, filter: 'running', icon: 'play-circle' },
      { label: 'Completed', value: summary.completed, filter: 'completed', icon: 'check-circle' },
      { label: 'Failed', value: summary.failed, filter: 'failed', icon: 'x-circle' },
      { label: 'Hung', value: summary.hung, filter: 'hung', icon: 'alert-triangle' },
    ];

    statuses.forEach((status) => {
      const isActive = this.activeFilter === status.filter;
      const card = container.createDiv({
        cls: `jq-stat-card ${status.filter}${isActive ? ' active' : ''}`
      });
      card.dataset.filter = status.filter;

      const iconEl = card.createDiv({ cls: 'jq-stat-icon' });
      setIcon(iconEl, status.icon);
      const content = card.createDiv({ cls: 'jq-stat-content' });
      content.createDiv({ cls: 'jq-stat-value', text: String(status.value) });
      content.createDiv({ cls: 'jq-stat-label', text: status.label });

      // Click handler to filter jobs
      card.onclick = () => this.selectFilter(status.filter);
    });
  }

  private async selectFilter(filter: FilterType) {
    this.activeFilter = filter;

    // Update card styling
    this.summaryContainer?.querySelectorAll('.jq-stat-card').forEach((card) => {
      card.removeClass('active');
      if ((card as HTMLElement).dataset.filter === filter) {
        card.addClass('active');
      }
    });

    // Refresh job list only
    if (this.jobsListContainer) {
      await this.renderJobs(this.jobsListContainer, filter);
    }
  }

  private async renderJobs(
    container: HTMLElement,
    filter: FilterType
  ) {
    container.empty();
    const loader = container.createDiv({ cls: 'jq-loader' });
    const loaderIcon = loader.createSpan({ cls: 'jq-loader-icon' });
    setIcon(loaderIcon, 'loader-2');
    loader.createSpan({ text: 'Loading jobs...' });

    try {
      let jobs: JobInfo[] = [];

      switch (filter) {
        case 'running':
          jobs = await this.jobQueueService.getRunningJobs();
          break;
        case 'pending':
          jobs = await this.jobQueueService.getPendingJobs();
          break;
        case 'completed':
          // Get completed jobs but filter to only status=completed (not failed)
          const completedJobs = await this.jobQueueService.getCompletedJobs(20);
          jobs = completedJobs.filter(j => j.status === 'completed');
          break;
        case 'failed':
          jobs = await this.jobQueueService.getFailedJobs(20);
          break;
        case 'hung':
          jobs = await this.jobQueueService.getHungJobs(this.settings.hungThresholdMinutes);
          break;
      }

      container.empty();

      if (jobs.length === 0) {
        const emptyState = container.createDiv({ cls: 'jq-empty-state' });
        const emptyIcon = emptyState.createDiv({ cls: 'jq-empty-icon' });
        const emptyConfig: Record<FilterType, { icon: string; text: string; hint: string }> = {
          running: { icon: 'zap-off', text: 'No jobs currently running', hint: 'Run an agent to see it here' },
          pending: { icon: 'inbox', text: 'No pending jobs in queue', hint: 'Jobs will appear here when queued' },
          completed: { icon: 'check-circle', text: 'No completed jobs yet', hint: 'Completed jobs will appear here' },
          failed: { icon: 'x-circle', text: 'No failed jobs', hint: 'Failed jobs will appear here' },
          hung: { icon: 'alert-triangle', text: 'No hung jobs', hint: `Jobs running > ${this.settings.hungThresholdMinutes} min appear here` },
        };
        const config = emptyConfig[filter];
        setIcon(emptyIcon, config.icon);
        emptyState.createDiv({ text: config.text, cls: 'jq-empty-text' });
        emptyState.createDiv({ text: config.hint, cls: 'jq-empty-hint' });
        return;
      }

      jobs.forEach((job) => {
        const jobCard = container.createDiv({ cls: 'jq-job-card' });

        // Header row
        const header = jobCard.createDiv({ cls: 'jq-job-header' });

        const idBadge = header.createDiv({ cls: 'jq-job-id' });
        const hashIcon = idBadge.createSpan({ cls: 'jq-job-id-icon' });
        setIcon(hashIcon, 'hash');
        const idText = idBadge.createSpan({ text: job.shortId, cls: 'jq-job-id-text' });

        // Copy to clipboard button
        const copyBtn = idBadge.createSpan({ cls: 'jq-copy-btn', attr: { 'aria-label': 'Copy ID' } });
        setIcon(copyBtn, 'clipboard-copy');
        copyBtn.onclick = async (e) => {
          e.stopPropagation();
          await navigator.clipboard.writeText(job.shortId);
          new Notice(`Copied ${job.shortId} to clipboard`);
          // Brief visual feedback
          copyBtn.addClass('copied');
          setIcon(copyBtn, 'check');
          setTimeout(() => {
            copyBtn.removeClass('copied');
            setIcon(copyBtn, 'clipboard-copy');
          }, 1500);
        };

        const typeBadge = header.createDiv({ cls: 'jq-job-type' });
        typeBadge.createSpan({ text: job.type });

        if (job.status) {
          const statusBadge = header.createDiv({ cls: `jq-job-status ${job.status}` });
          const statusIcon = statusBadge.createSpan({ cls: 'jq-status-icon' });
          const iconName = job.status === 'running' ? 'play' : job.status === 'pending' ? 'clock' :
                          job.status === 'completed' ? 'check' : job.status === 'failed' ? 'x' : 'alert-triangle';
          setIcon(statusIcon, iconName);
          statusBadge.createSpan({ text: job.status });
        }

        // Details grid
        const details = jobCard.createDiv({ cls: 'jq-job-details' });

        if (job.assignedTo) {
          const detail = details.createDiv({ cls: 'jq-job-detail' });
          const icon = detail.createSpan({ cls: 'jq-detail-icon' });
          setIcon(icon, 'bot');
          detail.createSpan({ text: job.assignedTo });
        }

        if (job.pid) {
          const detail = details.createDiv({ cls: 'jq-job-detail' });
          const icon = detail.createSpan({ cls: 'jq-detail-icon' });
          setIcon(icon, 'cpu');
          detail.createSpan({ text: `PID ${job.pid}` });
        }

        if (job.createdAt) {
          const detail = details.createDiv({ cls: 'jq-job-detail' });
          const icon = detail.createSpan({ cls: 'jq-detail-icon' });
          setIcon(icon, 'calendar');
          detail.createSpan({ text: this.formatDate(new Date(job.createdAt)) });
        }

        if (job.startedAt) {
          const detail = details.createDiv({ cls: 'jq-job-detail' });
          const icon = detail.createSpan({ cls: 'jq-detail-icon' });
          setIcon(icon, 'clock');
          detail.createSpan({ text: `Started ${this.formatDate(new Date(job.startedAt))}` });
        }

        if (job.completedAt) {
          const detail = details.createDiv({ cls: 'jq-job-detail' });
          const icon = detail.createSpan({ cls: 'jq-detail-icon' });
          setIcon(icon, 'check-circle');
          detail.createSpan({ text: `Completed ${this.formatDate(new Date(job.completedAt))}` });
        }

        if (job.exitCode !== undefined) {
          const detail = details.createDiv({ cls: 'jq-job-detail' });
          const icon = detail.createSpan({ cls: 'jq-detail-icon' });
          setIcon(icon, job.exitCode === 0 ? 'check' : 'x');
          detail.createSpan({ text: `Exit: ${job.exitCode}` });
        }

        if (job.error) {
          const errorEl = jobCard.createDiv({ cls: 'jq-job-error' });
          const errorIcon = errorEl.createSpan({ cls: 'jq-error-icon' });
          setIcon(errorIcon, 'alert-circle');
          errorEl.createSpan({ text: job.error, cls: 'jq-error-message' });
        }

        // Actions row - logs on left, action icons on right
        const actions = jobCard.createDiv({ cls: 'jq-job-actions' });

        // Left side: Logs button
        const actionsLeft = actions.createDiv({ cls: 'jq-actions-left' });
        const viewLogsBtn = actionsLeft.createEl('button', { cls: 'jq-action-btn' });
        const logsIcon = viewLogsBtn.createSpan({ cls: 'jq-action-icon' });
        setIcon(logsIcon, 'file-text');
        viewLogsBtn.createSpan({ text: 'Logs' });
        viewLogsBtn.onclick = () => this.viewJobLogs(job);

        // Right side: Action icons (for non-terminal states)
        const actionsRight = actions.createDiv({ cls: 'jq-actions-right' });
        const isActionable = job.status === 'pending' || job.status === 'running';

        if (isActionable) {
          // Mark as complete button
          const completeBtn = actionsRight.createEl('button', {
            cls: 'jq-icon-btn jq-icon-success',
            attr: {
              'aria-label': 'Mark as completed',
              'title': 'Mark as completed'
            }
          });
          setIcon(completeBtn, 'check-circle');
          completeBtn.onclick = () => this.markJobComplete(job);

          // Cancel/Kill button
          const cancelLabel = job.status === 'running' ? 'Kill job' : 'Cancel job';
          const killBtn = actionsRight.createEl('button', {
            cls: 'jq-icon-btn jq-icon-danger',
            attr: {
              'aria-label': cancelLabel,
              'title': cancelLabel
            }
          });
          setIcon(killBtn, job.status === 'running' ? 'square' : 'x-circle');
          killBtn.onclick = () => this.cancelJob(job);
        }
      });
    } catch (error) {
      container.empty();
      const errorState = container.createDiv({ cls: 'jq-error-state' });
      const errorIcon = errorState.createDiv({ cls: 'jq-error-state-icon' });
      setIcon(errorIcon, 'alert-triangle');
      errorState.createDiv({ text: 'Error loading jobs', cls: 'jq-error-title' });
      errorState.createDiv({ text: error.message, cls: 'jq-error-detail' });
    }
  }

  private async viewJobLogs(job: JobInfo) {
    try {
      // Try Supabase logs first
      let logs = await this.jobQueueService.getJobLogs(job.shortId, 50);
      let source = 'supabase';

      // Fallback to local logs if Supabase is empty and we have an agent
      if (logs.length === 0 && job.assignedTo) {
        const jobDate = job.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
        const localResult = await this.jobQueueService.getLocalLogs(
          this.settings.business,
          job.assignedTo,
          jobDate
        );
        if (localResult.logs.length > 0) {
          logs = localResult.logs;
          source = 'local';
        }
      }

      // Create a new modal for logs
      const logsModal = new Modal(this.app);
      logsModal.titleEl.setText(`Logs: ${job.shortId}`);

      const { contentEl } = logsModal;
      contentEl.addClass('persona-job-logs-modal');

      if (logs.length === 0) {
        if (job.status === 'pending') {
          contentEl.createDiv({ text: 'Job hasn\'t started yet - logs will appear when running' });
        } else {
          contentEl.createDiv({ text: 'No logs available' });
        }
      } else {
        // Show source indicator
        const sourceIndicator = contentEl.createDiv({ cls: 'logs-source' });
        sourceIndicator.createSpan({
          text: source === 'local' ? '📁 From local log file' : '☁️ From database',
          cls: 'logs-source-text'
        });

        const logsList = contentEl.createDiv({ cls: 'logs-list' });

        logs.forEach((log) => {
          const logEntry = logsList.createDiv({ cls: `log-entry ${log.level}` });

          if (log.timestamp) {
            const timestamp = new Date(log.timestamp);
            logEntry.createSpan({
              cls: 'log-timestamp',
              text: isNaN(timestamp.getTime()) ? log.timestamp : this.formatTime(timestamp),
            });
          }

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

  private async markJobComplete(job: JobInfo) {
    try {
      const result = await this.jobQueueService.updateJobStatus(job.shortId, 'completed');
      if (result.success) {
        new Notice(`Job ${job.shortId} marked as completed`);
        await this.refresh();
      } else {
        new Notice(`Failed to mark job as completed: ${result.error}`);
      }
    } catch (error) {
      new Notice(`Error: ${error.message}`);
    }
  }

  private async cancelJob(job: JobInfo) {
    try {
      const result = await this.jobQueueService.updateJobStatus(job.shortId, 'cancelled');
      if (result.success) {
        new Notice(`Job ${job.shortId} cancelled`);
        await this.refresh();
      } else {
        new Notice(`Failed to cancel job: ${result.error}`);
      }
    } catch (error) {
      new Notice(`Error: ${error.message}`);
    }
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
    // Smooth refresh: update stat values in-place, then refresh job list
    await this.refreshSummarySmooth();
    await this.refreshJobsSmooth();
  }

  private async refreshSummarySmooth() {
    if (!this.summaryContainer) return;

    try {
      const summary = await this.jobQueueService.getJobSummary();

      // Update only the count values, not the entire card structure
      const filterMap: Record<FilterType, number> = {
        pending: summary.pending,
        running: summary.running,
        completed: summary.completed,
        failed: summary.failed,
        hung: summary.hung,
      };

      this.summaryContainer.querySelectorAll('.jq-stat-card').forEach((card) => {
        const filter = (card as HTMLElement).dataset.filter as FilterType;
        if (filter && filterMap[filter] !== undefined) {
          const valueEl = card.querySelector('.jq-stat-value');
          if (valueEl) {
            valueEl.textContent = String(filterMap[filter]);
          }
        }
      });
    } catch (error) {
      console.error('Failed to refresh summary:', error);
    }
  }

  private async refreshJobsSmooth() {
    if (!this.jobsListContainer) return;
    await this.renderJobs(this.jobsListContainer, this.activeFilter);
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
