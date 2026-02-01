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
   * Call the Python bridge script
   */
  private async callBridge(command: string, ...args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [this.bridgePath, command, ...args], {
        cwd: path.join(this.settings.personaRoot, 'python'),
        env: { ...process.env },
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
          reject(new Error(`Bridge script failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            reject(new Error(result.error));
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
   * Get logs for a job
   */
  async getJobLogs(jobId: string, limit?: number): Promise<JobLog[]> {
    const result = await this.callBridge('get_job_logs', jobId, String(limit || 50));
    return result.logs || [];
  }

  /**
   * Get summary of all jobs by status
   */
  async getJobSummary(): Promise<JobSummary> {
    return this.callBridge('get_job_summary');
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
}
