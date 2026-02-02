import { spawn } from 'child_process';
import { Notice } from 'obsidian';
import { PersonaSettings, ExecutionResult, ProgressState } from '../types';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { AgentDefinitionParser } from './AgentDefinitionParser';
import { AgentProviderOverride } from '../providers/types';
import { JobQueueService, JobInfo } from './JobQueueService';
import * as fs from 'fs';
import * as path from 'path';

export class ExecutionService {
  private runningExecutions: Map<string, { agent: string; action: string; startTime: Date; jobId?: string }> = new Map();
  private lastNoticeTime: Map<string, number> = new Map();
  private readonly NOTICE_THROTTLE_MS = 2000;
  private providerRegistry: ProviderRegistry;
  private agentParser: AgentDefinitionParser;
  private jobQueueService: JobQueueService | null = null;

  constructor(private settings: PersonaSettings, jobQueueService?: JobQueueService) {
    this.providerRegistry = new ProviderRegistry(settings.providers, settings.defaultProvider);
    this.agentParser = new AgentDefinitionParser();
    this.jobQueueService = jobQueueService || null;
  }

  /**
   * Reinitialize provider registry with new settings
   */
  reinitializeProviders(): void {
    this.providerRegistry.reinitialize(this.settings.providers, this.settings.defaultProvider);
  }

  /**
   * Get the provider registry for external access
   */
  getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }

  /**
   * Show a notice with throttling to prevent duplicate notifications
   */
  private showThrottledNotice(message: string, key: string): void {
    const now = Date.now();
    const lastTime = this.lastNoticeTime.get(key) || 0;
    if (now - lastTime >= this.NOTICE_THROTTLE_MS) {
      new Notice(message);
      this.lastNoticeTime.set(key, now);
    }
  }

  /**
   * Update job status with retry logic and exponential backoff
   */
  private async updateJobStatusWithRetry(
    jobId: string,
    status: string,
    error?: string,
    maxRetries: number = 3
  ): Promise<boolean> {
    if (!this.jobQueueService) return false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.jobQueueService.updateJobStatus(jobId, status, error);
      if (result.success) return true;

      console.warn(`Job status update attempt ${attempt + 1} failed:`, result.error);

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
    return false;
  }

  /**
   * Log system-level errors to persistent log file
   */
  private logSystemError(message: string): void {
    const logDir = path.join(this.settings.personaRoot, 'instances', this.settings.business, 'logs');
    const logFile = path.join(logDir, 'system.log');
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ERROR: ${message}\n`;

    try {
      // Ensure log directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(logFile, line);
    } catch (err) {
      console.error('Failed to write to system log:', err);
    }
  }

  async runAgent(agent: string, action: string, instanceOverride?: string): Promise<ExecutionResult> {
    // Prevent duplicate runs of the same agent
    if (this.isAgentRunning(agent)) {
      this.showThrottledNotice(`Agent ${agent} is already running`, `running-${agent}`);
      return {
        success: false,
        agent,
        action,
        startTime: new Date(),
        status: 'failed',
      };
    }

    const scriptPath = `${this.settings.personaRoot}/scripts/run-agent.sh`;
    const business = instanceOverride || this.settings.business;
    const executionId = `${agent}-${Date.now()}`;
    const startTime = new Date();

    // Create job in Supabase for tracking
    let jobInfo: JobInfo | undefined;
    if (this.jobQueueService) {
      try {
        jobInfo = await this.jobQueueService.createAgentActionJob(agent, action, 300);
        console.log(`Created job ${jobInfo.shortId} for ${agent}:${action}`);
      } catch (err) {
        console.warn('Failed to create job in queue:', err);
        // Continue even if job creation fails - don't block agent execution
      }
    }

    // Track running execution
    this.runningExecutions.set(executionId, { agent, action, startTime, jobId: jobInfo?.shortId });

    return new Promise((resolve) => {
      const childProcess = spawn('bash', [scriptPath, business, agent, action], {
        cwd: this.settings.personaRoot,
        env: { ...process.env },
      });

      // Mark job as running immediately after spawn (Phase 2)
      if (jobInfo && this.jobQueueService) {
        this.updateJobStatusWithRetry(jobInfo.shortId, 'running').catch(() => {
          // Non-critical - job will still run, just won't show as "running"
        });
      }

      let stderr = '';

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', async (code) => {
        this.runningExecutions.delete(executionId);
        const endTime = new Date();
        const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

        // Update job status in Supabase with retry logic
        if (jobInfo) {
          const status = code === 0 ? 'completed' : 'failed';
          const error = code !== 0 ? `Exit code: ${code}` : undefined;
          const success = await this.updateJobStatusWithRetry(jobInfo.shortId, status, error);

          if (!success) {
            // Surface failure to user - they need to know their job tracking is broken
            new Notice(`Warning: Failed to update job ${jobInfo.shortId} status after 3 retries`);
            this.logSystemError(`Job ${jobInfo.shortId} status update failed after 3 retries (status: ${status})`);
          }
        }

        if (code === 0) {
          this.showThrottledNotice(`Agent ${agent} completed in ${durationSec}s`, `complete-${agent}`);
        } else {
          this.showThrottledNotice(`Agent ${agent} failed: ${stderr.slice(0, 100)}`, `fail-${agent}`);
        }

        resolve({
          success: code === 0,
          agent,
          action,
          startTime,
          endTime,
          status: code === 0 ? 'completed' : 'failed',
        });
      });

      childProcess.on('error', async (err) => {
        this.runningExecutions.delete(executionId);

        // Update job status on error with retry logic
        if (jobInfo) {
          const success = await this.updateJobStatusWithRetry(jobInfo.shortId, 'failed', err.message);
          if (!success) {
            new Notice(`Warning: Failed to update job ${jobInfo.shortId} status after 3 retries`);
            this.logSystemError(`Job ${jobInfo.shortId} status update failed after 3 retries (error: ${err.message})`);
          }
        }

        this.showThrottledNotice(`Failed to start agent ${agent}: ${err.message}`, `error-${agent}`);

        resolve({
          success: false,
          agent,
          action,
          startTime,
          endTime: new Date(),
          status: 'failed',
        });
      });
    });
  }

  /**
   * Run an agent using native TypeScript providers (Phase 2.5)
   *
   * This method bypasses shell scripts and directly invokes the AI CLI tools
   * using the appropriate provider based on agent definition or settings.
   */
  async runAgentNative(agent: string, action: string, instanceOverride?: string): Promise<ExecutionResult> {
    // Prevent duplicate runs of the same agent
    if (this.isAgentRunning(agent)) {
      this.showThrottledNotice(`Agent ${agent} is already running`, `running-${agent}`);
      return {
        success: false,
        agent,
        action,
        startTime: new Date(),
        status: 'failed',
      };
    }

    const executionId = `${agent}-${Date.now()}`;
    const startTime = new Date();
    const business = instanceOverride || this.settings.business;

    // Track running execution
    this.runningExecutions.set(executionId, { agent, action, startTime });

    try {
      // Get agent-specific provider override from agent definition file
      const agentPath = this.agentParser.buildAgentPath(
        this.settings.personaRoot,
        business,
        agent
      );
      const providerOverride = this.agentParser.getProviderOverride(agentPath);

      // Get the appropriate provider
      const provider = this.providerRegistry.getProvider(providerOverride);

      // Build the prompt from action file
      const prompt = await this.buildPromptFromAction(agent, action);
      if (!prompt) {
        this.runningExecutions.delete(executionId);
        this.showThrottledNotice(`Action file not found: ${action}`, `error-${agent}`);
        return {
          success: false,
          agent,
          action,
          startTime,
          endTime: new Date(),
          status: 'failed',
        };
      }

      // Get the instance path for working directory
      const instancePath = path.join(this.settings.personaRoot, 'instances', business);

      // Execute using the provider
      const result = await provider.execute({
        prompt,
        model: providerOverride?.model || 'sonnet',
        cwd: instancePath,
        timeout: 300000, // 5 minute default timeout
      });

      this.runningExecutions.delete(executionId);
      const endTime = new Date();
      const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      if (result.success) {
        this.showThrottledNotice(
          `Agent ${agent} (${provider.displayName}) completed in ${durationSec}s`,
          `complete-${agent}`
        );
      } else {
        const errorMsg = result.stderr?.slice(0, 100) || 'Unknown error';
        this.showThrottledNotice(`Agent ${agent} failed: ${errorMsg}`, `fail-${agent}`);
      }

      return {
        success: result.success,
        agent,
        action,
        startTime,
        endTime,
        status: result.success ? 'completed' : 'failed',
      };
    } catch (err) {
      this.runningExecutions.delete(executionId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.showThrottledNotice(`Failed to execute agent ${agent}: ${errorMsg}`, `error-${agent}`);

      return {
        success: false,
        agent,
        action,
        startTime,
        endTime: new Date(),
        status: 'failed',
      };
    }
  }

  /**
   * Build the prompt from an action file
   *
   * Reads the action markdown file and returns its content as the prompt.
   * Actions are stored in: instances/{business}/agents/{agent}/actions/{action}.md
   */
  private async buildPromptFromAction(agent: string, action: string): Promise<string | null> {
    const business = this.settings.business;

    // Try the actions directory first (standard location)
    const actionPath = path.join(
      this.settings.personaRoot,
      'instances',
      business,
      'agents',
      agent,
      'actions',
      `${action}.md`
    );

    try {
      if (fs.existsSync(actionPath)) {
        return fs.readFileSync(actionPath, 'utf8');
      }

      // Fall back to prompts directory (legacy location)
      const legacyPath = path.join(
        this.settings.personaRoot,
        'instances',
        business,
        'prompts',
        agent,
        `${action}.md`
      );

      if (fs.existsSync(legacyPath)) {
        return fs.readFileSync(legacyPath, 'utf8');
      }

      console.error(`Action file not found: ${actionPath}`);
      return null;
    } catch (err) {
      console.error('Failed to read action file:', err);
      return null;
    }
  }

  getRunningCount(): number {
    return this.runningExecutions.size;
  }

  getRunningExecutions(): Array<{ agent: string; action: string; startTime: Date }> {
    return Array.from(this.runningExecutions.values());
  }

  isAgentRunning(agent: string): boolean {
    for (const exec of this.runningExecutions.values()) {
      if (exec.agent === agent) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the current progress state from the progress.json file
   */
  getProgress(): ProgressState | null {
    const progressPath = path.join(
      this.settings.personaRoot,
      'instances',
      this.settings.business,
      'state',
      'progress.json'
    );

    try {
      if (fs.existsSync(progressPath)) {
        const content = fs.readFileSync(progressPath, 'utf8');
        return JSON.parse(content) as ProgressState;
      }
    } catch (err) {
      console.error('Failed to read progress file:', err);
    }

    return null;
  }

  /**
   * Clear progress file to prevent stale data from previous agent runs
   */
  clearProgress(): void {
    const progressPath = path.join(
      this.settings.personaRoot,
      'instances',
      this.settings.business,
      'state',
      'progress.json'
    );

    try {
      if (fs.existsSync(progressPath)) {
        fs.unlinkSync(progressPath);
      }
    } catch (err) {
      // File may not exist or be locked, that's fine
      console.log('Could not clear progress file:', err);
    }
  }

  /**
   * Get elapsed time since agent started
   */
  getElapsedTime(progress: ProgressState): string {
    if (!progress.started) return '';

    const started = new Date(progress.started);
    const now = new Date();
    const elapsedMs = now.getTime() - started.getTime();
    const seconds = Math.floor(elapsedMs / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Get list of available instances by scanning the instances directory
   */
  getAvailableInstances(): string[] {
    const instancesPath = path.join(this.settings.personaRoot, 'instances');

    try {
      if (!fs.existsSync(instancesPath)) {
        return [];
      }

      return fs.readdirSync(instancesPath).filter((name) => {
        const fullPath = path.join(instancesPath, name);
        return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
      });
    } catch (err) {
      console.error('Failed to read instances directory:', err);
      return [];
    }
  }
}
