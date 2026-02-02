import { spawn } from 'child_process';
import { Notice } from 'obsidian';
import { PersonaSettings, ExecutionResult, ProgressState } from '../types';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { AgentDefinitionParser } from './AgentDefinitionParser';
import { AgentProviderOverride } from '../providers/types';
import { JobQueueService, JobInfo } from './JobQueueService';
import * as fs from 'fs';
import * as path from 'path';

interface RunningAgentState {
  agent: string;
  action: string;
  startTime: string;
  jobId?: string;
  pid?: number;
}

interface RunningAgentsFile {
  version: 1;
  agents: Record<string, RunningAgentState>;
  lastUpdated: string;
}

export class ExecutionService {
  private runningExecutions: Map<string, { agent: string; action: string; startTime: Date; jobId?: string; pid?: number }> = new Map();
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private lastNoticeTime: Map<string, number> = new Map();
  private readonly NOTICE_THROTTLE_MS = 2000;
  private readonly RUNNING_AGENTS_FILE = 'running-agents.json';
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private providerRegistry: ProviderRegistry;
  private agentParser: AgentDefinitionParser;
  private jobQueueService: JobQueueService | null = null;
  private initialized: boolean = false;

  constructor(private settings: PersonaSettings, jobQueueService?: JobQueueService) {
    this.providerRegistry = new ProviderRegistry(settings.providers, settings.defaultProvider);
    this.agentParser = new AgentDefinitionParser();
    this.jobQueueService = jobQueueService || null;
  }

  /**
   * Initialize the execution service - sync running state with Supabase
   * Should be called on plugin load
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load local running agents state
      const localState = this.loadRunningAgentsFile();

      // Clean up orphaned processes from previous session
      await this.cleanupOrphanedProcesses(localState);

      // Sync with Supabase if available
      if (this.jobQueueService) {
        await this.syncWithSupabase(localState);
      } else {
        // No Supabase - just restore from local file
        for (const [id, state] of Object.entries(localState.agents)) {
          this.runningExecutions.set(id, {
            agent: state.agent,
            action: state.action,
            startTime: new Date(state.startTime),
            jobId: state.jobId,
            pid: state.pid,
          });
        }
      }

      this.initialized = true;
      console.log(`ExecutionService initialized with ${this.runningExecutions.size} running agents`);
    } catch (err) {
      console.error('Failed to initialize ExecutionService:', err);
      this.initialized = true; // Still mark as initialized to allow operation
    }
  }

  /**
   * Clean up orphaned processes from a previous session
   * Orphaned = PID in state file but process is either dead or stale
   */
  private async cleanupOrphanedProcesses(localState: RunningAgentsFile): Promise<void> {
    const orphanedJobs: { id: string; state: RunningAgentState }[] = [];

    for (const [id, state] of Object.entries(localState.agents)) {
      if (!state.pid) continue;

      // Check if the process is still running
      const isRunning = this.isProcessRunning(state.pid);

      if (!isRunning) {
        // Process is dead - this is an orphaned job
        console.log(`Found orphaned agent ${state.agent} (PID ${state.pid} no longer running)`);
        orphanedJobs.push({ id, state });
      } else {
        // Process is running - check if it's been running too long (stale)
        const startTime = new Date(state.startTime);
        const now = new Date();
        const runningMinutes = (now.getTime() - startTime.getTime()) / 60000;
        const maxMinutes = (this.settings.agentTimeoutMinutes || 5) * 2; // 2x timeout as safety margin

        if (runningMinutes > maxMinutes) {
          // Process has been running way too long - likely orphaned/hung
          const pid = state.pid;
          console.log(`Found stale agent ${state.agent} (PID ${pid} running for ${Math.round(runningMinutes)}m)`);

          // Kill the stale process
          try {
            process.kill(-pid, 'SIGTERM');
            setTimeout(() => {
              try {
                process.kill(-pid, 'SIGKILL');
              } catch {
                // May already be dead
              }
            }, 5000);
          } catch {
            // Try without process group
            try {
              process.kill(pid, 'SIGKILL');
            } catch {
              // Already dead
            }
          }

          orphanedJobs.push({ id, state });
        }
      }
    }

    // Update Supabase status for orphaned jobs
    if (this.jobQueueService && orphanedJobs.length > 0) {
      for (const { state } of orphanedJobs) {
        if (state.jobId) {
          try {
            await this.jobQueueService.updateJobStatus(
              state.jobId,
              'failed',
              'Orphaned: Process terminated unexpectedly (plugin reload/crash)'
            );
            console.log(`Marked orphaned job ${state.jobId} as failed`);
          } catch (err) {
            console.warn(`Failed to update orphaned job ${state.jobId}:`, err);
          }
        }
      }
    }

    // Remove orphaned entries from local state
    for (const { id } of orphanedJobs) {
      delete localState.agents[id];
    }

    // Save cleaned state
    if (orphanedJobs.length > 0) {
      this.saveRunningAgentsFile();
      console.log(`Cleaned up ${orphanedJobs.length} orphaned agent(s)`);
    }
  }

  /**
   * Get the path to the running agents state file
   */
  private getRunningAgentsPath(): string {
    return path.join(
      this.settings.personaRoot,
      'instances',
      this.settings.business,
      'state',
      this.RUNNING_AGENTS_FILE
    );
  }

  /**
   * Load running agents from local state file
   */
  private loadRunningAgentsFile(): RunningAgentsFile {
    const filePath = this.getRunningAgentsPath();

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content) as RunningAgentsFile;
      }
    } catch (err) {
      console.warn('Failed to load running agents file:', err);
    }

    return { version: 1, agents: {}, lastUpdated: new Date().toISOString() };
  }

  /**
   * Save running agents to local state file
   */
  private saveRunningAgentsFile(): void {
    const filePath = this.getRunningAgentsPath();
    const stateDir = path.dirname(filePath);

    try {
      // Ensure state directory exists
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      const state: RunningAgentsFile = {
        version: 1,
        agents: {},
        lastUpdated: new Date().toISOString(),
      };

      for (const [id, exec] of this.runningExecutions.entries()) {
        state.agents[id] = {
          agent: exec.agent,
          action: exec.action,
          startTime: exec.startTime.toISOString(),
          jobId: exec.jobId,
          pid: exec.pid,
        };
      }

      // Write atomically: write to temp file then rename
      const tempPath = filePath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      console.error('Failed to save running agents file:', err);
    }
  }

  /**
   * Sync local state with Supabase running jobs
   */
  private async syncWithSupabase(localState: RunningAgentsFile): Promise<void> {
    if (!this.jobQueueService) return;

    try {
      // Get running jobs from Supabase
      const runningJobs = await this.jobQueueService.getRunningJobs();
      const supabaseJobIds = new Set(runningJobs.map(j => j.shortId));

      // Check local agents against Supabase
      for (const [id, state] of Object.entries(localState.agents)) {
        if (state.jobId && supabaseJobIds.has(state.jobId)) {
          // Job is still running in Supabase - restore to in-memory
          this.runningExecutions.set(id, {
            agent: state.agent,
            action: state.action,
            startTime: new Date(state.startTime),
            jobId: state.jobId,
            pid: state.pid,
          });
        } else if (state.jobId) {
          // Job completed/failed in Supabase - don't restore
          console.log(`Agent ${state.agent} (job ${state.jobId}) no longer running in Supabase`);
        } else {
          // Local-only agent (no job ID) - check if PID is still alive
          if (state.pid && this.isProcessRunning(state.pid)) {
            this.runningExecutions.set(id, {
              agent: state.agent,
              action: state.action,
              startTime: new Date(state.startTime),
              pid: state.pid,
            });
          }
        }
      }

      // Save cleaned state
      this.saveRunningAgentsFile();
    } catch (err) {
      console.warn('Failed to sync with Supabase:', err);
      // On failure, restore local state as-is
      for (const [id, state] of Object.entries(localState.agents)) {
        this.runningExecutions.set(id, {
          agent: state.agent,
          action: state.action,
          startTime: new Date(state.startTime),
          jobId: state.jobId,
          pid: state.pid,
        });
      }
    }
  }

  /**
   * Check if a process is still running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0); // Signal 0 tests if process exists
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start sending periodic heartbeats for a job
   */
  private startHeartbeat(executionId: string, jobId: string): void {
    if (!this.jobQueueService) return;

    // Clear any existing heartbeat for this execution
    this.stopHeartbeat(executionId);

    const interval = setInterval(async () => {
      try {
        const result = await this.jobQueueService!.heartbeat(jobId);
        if (!result.success) {
          console.warn(`Heartbeat failed for job ${jobId}:`, result.error);
          // Don't stop on failure - job might still be running
        }
      } catch (err) {
        console.warn(`Heartbeat error for job ${jobId}:`, err);
        // Don't stop on error - job might still be running
      }
    }, this.HEARTBEAT_INTERVAL_MS);

    this.heartbeatIntervals.set(executionId, interval);
  }

  /**
   * Stop heartbeat for an execution
   */
  private stopHeartbeat(executionId: string): void {
    const interval = this.heartbeatIntervals.get(executionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(executionId);
    }
  }

  /**
   * Check if agent is running - checks both local and optionally Supabase
   */
  async isAgentRunningAsync(agent: string): Promise<boolean> {
    // First check in-memory
    if (this.isAgentRunning(agent)) {
      return true;
    }

    // If Supabase available, double-check there
    if (this.jobQueueService) {
      try {
        const runningJobs = await this.jobQueueService.getRunningJobs();
        return runningJobs.some(j => j.assignedTo === agent);
      } catch {
        // On error, trust local state
        return false;
      }
    }

    return false;
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
    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Prevent duplicate runs of the same agent - check both local and Supabase
    const isRunning = await this.isAgentRunningAsync(agent);
    if (isRunning) {
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

    // Track running execution (will add PID after spawn)
    this.runningExecutions.set(executionId, { agent, action, startTime, jobId: jobInfo?.shortId });
    this.saveRunningAgentsFile();

    // Configurable timeout in milliseconds (default 5 minutes)
    const timeoutMs = (this.settings.agentTimeoutMinutes || 5) * 60 * 1000;

    return new Promise((resolve) => {
      const childProcess = spawn('bash', [scriptPath, business, agent, action], {
        cwd: this.settings.personaRoot,
        env: { ...process.env },
      });

      // Update with PID for orphan cleanup tracking
      const pid = childProcess.pid;
      if (pid) {
        const exec = this.runningExecutions.get(executionId);
        if (exec) {
          exec.pid = pid;
          this.saveRunningAgentsFile();
        }
      }

      // Mark job as running immediately after spawn (Phase 2)
      if (jobInfo && this.jobQueueService) {
        this.updateJobStatusWithRetry(jobInfo.shortId, 'running')
          .then((success) => {
            // Always start heartbeat - even if status update failed,
            // heartbeat will keep the job alive and visible
            this.startHeartbeat(executionId, jobInfo.shortId);

            if (!success) {
              // Alert user that job status is stuck - they need to know tracking is broken
              new Notice(`Warning: Job ${jobInfo.shortId} stuck in 'pending' - status update failed after retries`);
              this.logSystemError(`Job ${jobInfo.shortId} failed to transition to 'running' after 3 retries - job will continue but tracking is broken`);
            }
          })
          .catch((err) => {
            // Start heartbeat anyway - job is still running
            this.startHeartbeat(executionId, jobInfo.shortId);
            this.logSystemError(`Job ${jobInfo.shortId} status update threw error: ${err.message}`);
          });
      }

      let stderr = '';
      let resolved = false;
      let timedOut = false;

      // Timeout handler - kill process if it runs too long
      const timeoutHandle = setTimeout(async () => {
        if (resolved) return;
        timedOut = true;

        console.warn(`Agent ${agent} timed out after ${timeoutMs / 1000}s, killing process ${pid}`);

        // Stop heartbeat
        this.stopHeartbeat(executionId);

        // Kill the process tree
        if (pid) {
          try {
            // Kill the process group (negative PID) to get child processes too
            process.kill(-pid, 'SIGTERM');
            // Give it 5 seconds to clean up, then force kill
            setTimeout(() => {
              try {
                process.kill(-pid, 'SIGKILL');
              } catch {
                // Process may have already exited
              }
            }, 5000);
          } catch {
            // Process may have already exited
            try {
              process.kill(pid, 'SIGKILL');
            } catch {
              // Ignore
            }
          }
        }

        this.runningExecutions.delete(executionId);
        this.saveRunningAgentsFile();

        // Update job status to failed with timeout error
        if (jobInfo) {
          const success = await this.updateJobStatusWithRetry(
            jobInfo.shortId,
            'failed',
            `Timeout: Agent exceeded ${timeoutMs / 1000}s limit`
          );
          if (!success) {
            this.logSystemError(`Job ${jobInfo.shortId} status update failed after timeout`);
          }
        }

        this.showThrottledNotice(`Agent ${agent} timed out after ${timeoutMs / 60000}m`, `timeout-${agent}`);

        resolved = true;
        resolve({
          success: false,
          agent,
          action,
          startTime,
          endTime: new Date(),
          status: 'failed',
        });
      }, timeoutMs);

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', async (code) => {
        clearTimeout(timeoutHandle);
        if (resolved) return; // Already handled by timeout
        resolved = true;

        // Stop heartbeat
        this.stopHeartbeat(executionId);

        this.runningExecutions.delete(executionId);
        this.saveRunningAgentsFile();
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
        clearTimeout(timeoutHandle);
        if (resolved) return;
        resolved = true;

        // Stop heartbeat
        this.stopHeartbeat(executionId);

        this.runningExecutions.delete(executionId);
        this.saveRunningAgentsFile();

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
