import { spawn } from 'child_process';
import { Notice } from 'obsidian';
import { PersonaSettings } from '../types';
import * as path from 'path';

export interface JobInfo {
  id: string;
  shortId: string;
  type: string;
  status: string;
  assignedTo?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: any;
  pid?: number;
  exitCode?: number;
}

export interface JobLog {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

export interface JobSummary {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  hung: number;
}

export class JobQueueService {
  private bridgePath: string;
  private lastNoticeTime: Map<string, number> = new Map();
  private readonly NOTICE_THROTTLE_MS = 2000;

  constructor(private settings: PersonaSettings) {
    this.bridgePath = path.join(settings.personaRoot, 'python/persona/bridge.py');
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
   * Build environment for Python subprocess.
   * Electron apps don't inherit terminal environment, so we must construct it.
   */
  private buildPythonEnv(): NodeJS.ProcessEnv {
    const pythonDir = path.join(this.settings.personaRoot, 'python');

    // Derive site-packages from configured Python path
    const pythonPath = this.settings.pythonPath;
    const pythonVersionMatch = pythonPath.match(/Python\.framework\/Versions\/([\d.]+)/);
    const pythonVersion = pythonVersionMatch ? pythonVersionMatch[1] : '3.12';
    const sitePackages = `/Library/Frameworks/Python.framework/Versions/${pythonVersion}/lib/python${pythonVersion}/site-packages`;

    // Fallback PATH for Electron context
    const pythonBinDir = path.dirname(pythonPath);
    const defaultPath = [
      pythonBinDir,
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/opt/homebrew/bin',
    ].join(':');

    return {
      ...process.env,
      PATH: process.env.PATH || defaultPath,
      PYTHONPATH: [pythonDir, sitePackages].join(':'),
      PYTHONUNBUFFERED: '1',
      // Supabase credentials (bypasses dotenv requirement)
      SUPABASE_URL: this.settings.supabaseUrl,
      SUPABASE_KEY: this.settings.supabaseKey,
    };
  }

  /**
   * Call the Python bridge script (single attempt)
   */
  private callBridgeOnce(command: string, ...args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonDir = path.join(this.settings.personaRoot, 'python');
      const pythonExecutable = this.settings.pythonPath;

      const pythonProcess = spawn(pythonExecutable, [this.bridgePath, command, ...args], {
        cwd: pythonDir,
        env: this.buildPythonEnv(),
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          // Include both stdout and stderr for better debugging
          // Python bridge may return JSON errors on stdout
          const errorDetails = stderr || stdout || '(no output)';
          reject(new Error(`Bridge script failed (exit ${code}): ${errorDetails}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            reject(new Error(`Bridge error: ${result.error}`));
          } else {
            resolve(result);
          }
        } catch (err) {
          reject(new Error(`Failed to parse bridge response: ${stdout}`));
        }
      });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to run bridge script: ${err.message}`));
      });
    });
  }

  /**
   * Check if an error is likely transient and worth retrying
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    // Retry on network errors, connection issues, and rate limits
    return (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502')
    );
  }

  /**
   * Call the Python bridge script with retry and exponential backoff
   */
  private async callBridge(command: string, ...args: string[]): Promise<any> {
    const maxRetries = 3;
    const baseDelayMs = 500;
    const maxDelayMs = 5000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.callBridgeOnce(command, ...args);
      } catch (error) {
        lastError = error as Error;

        // Don't retry non-transient errors (application errors, validation, etc.)
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
          maxDelayMs
        );
        console.warn(`Bridge call '${command}' failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${Math.round(delay)}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Create a new job in the queue
   */
  async createJob(
    type: string,
    payload: any,
    assignedTo?: string,
    sourceFile?: string,
    sourceLine?: number,
    tags?: string[]
  ): Promise<JobInfo> {
    const jobData = {
      type,
      payload,
      agent: assignedTo,
      sourceFile,
      sourceLine,
      tags,
    };

    try {
      const result = await this.callBridge('create_job', JSON.stringify(jobData));
      this.showThrottledNotice(
        `Job ${result.shortId} created (${type})`,
        `job-created-${result.shortId}`
      );
      return result;
    } catch (err) {
      this.showThrottledNotice(`Failed to create job: ${err.message}`, 'job-create-error');
      throw err;
    }
  }

  /**
   * Create a research job from a question
   */
  async createResearchJob(question: string, sourceFile?: string): Promise<JobInfo> {
    return this.createJob(
      'research',
      { question },
      'researcher',
      sourceFile,
      undefined,
      ['research', 'daily-note']
    );
  }

  /**
   * Create a meeting extraction job
   */
  async createMeetingExtractionJob(
    meeting: any,
    sourceFile: string
  ): Promise<JobInfo> {
    return this.createJob(
      'meeting_extract',
      { meeting },
      'assistant',
      sourceFile,
      undefined,
      ['meeting', 'extraction']
    );
  }

  /**
   * Create an agent action job (legacy compatibility)
   */
  async createAgentActionJob(
    agent: string,
    action: string,
    timeout?: number
  ): Promise<JobInfo> {
    return this.createJob(
      'agent_action',
      { agent, action, timeout: timeout || 300 },
      agent,
      undefined,
      undefined,
      ['agent', 'legacy']
    );
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<JobInfo> {
    return this.callBridge('get_job_status', jobId);
  }

  /**
   * Get pending jobs for an agent
   */
  async getPendingJobs(agent?: string): Promise<JobInfo[]> {
    const result = await this.callBridge('get_pending_jobs', agent || '');
    return result.jobs || [];
  }

  /**
   * Get running jobs for an agent
   */
  async getRunningJobs(agent?: string): Promise<JobInfo[]> {
    const result = await this.callBridge('get_running_jobs', agent || '');
    return result.jobs || [];
  }

  /**
   * Get completed jobs (recently finished)
   */
  async getCompletedJobs(limit?: number): Promise<JobInfo[]> {
    const result = await this.callBridge('get_completed_jobs', String(limit || 20));
    return result.jobs || [];
  }

  /**
   * Get hung jobs (running longer than threshold)
   */
  async getHungJobs(thresholdMinutes?: number): Promise<JobInfo[]> {
    const threshold = thresholdMinutes || 5;
    const result = await this.callBridge('get_hung_jobs', String(threshold));
    return result.jobs || [];
  }

  /**
   * Get failed jobs only (subset of completed)
   */
  async getFailedJobs(limit?: number): Promise<JobInfo[]> {
    const result = await this.callBridge('get_failed_jobs', String(limit || 20));
    return result.jobs || [];
  }

  /**
   * Get logs for a job
   */
  async getJobLogs(jobId: string, limit?: number): Promise<JobLog[]> {
    const result = await this.callBridge('get_job_logs', jobId, String(limit || 50));
    return result.logs || [];
  }

  /**
   * Get logs from local log file (fallback when Supabase logs are empty)
   */
  async getLocalLogs(business: string, agent: string, date: string): Promise<{ logs: JobLog[]; source: string; exists?: boolean }> {
    const result = await this.callBridge('get_local_logs', business, agent, date);
    return {
      logs: result.logs || [],
      source: 'local',
      exists: result.exists ?? false
    };
  }

  /**
   * Get summary of all jobs by status
   */
  async getJobSummary(): Promise<JobSummary> {
    return this.callBridge('get_job_summary');
  }

  /**
   * Update job status
   * Returns success/failure to allow caller to handle retries
   */
  async updateJobStatus(jobId: string, status: string, error?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = { status, error };
      await this.callBridge('update_job_status', jobId, JSON.stringify(payload));
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a heartbeat for a running job
   * Returns success/failure to allow caller to handle errors gracefully
   */
  async heartbeat(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.callBridge('heartbeat', jobId);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if bridge is available
   */
  async checkBridgeAvailable(): Promise<boolean> {
    try {
      await this.getJobSummary();
      return true;
    } catch (err) {
      console.error('Bridge not available:', err);
      return false;
    }
  }

  /**
   * Get daily agent performance metrics
   */
  async getAgentDailyPerformance(agent?: string, days?: number): Promise<{
    metrics: Array<{
      date: string;
      agent: string;
      jobsCompleted: number;
      successful: number;
      failed: number;
      avgDurationSeconds: number;
      minDurationSeconds: number;
      maxDurationSeconds: number;
    }>;
  }> {
    const result = await this.callBridge(
      'get_agent_daily_performance',
      agent || '',
      String(days || 7)
    );
    return { metrics: result.metrics || [] };
  }
}
