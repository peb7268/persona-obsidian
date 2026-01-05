import { spawn } from 'child_process';
import { Notice } from 'obsidian';
import { PersonaSettings, ExecutionResult, ProgressState } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class ExecutionService {
  private runningExecutions: Map<string, { agent: string; action: string; startTime: Date }> = new Map();
  private lastNoticeTime: Map<string, number> = new Map();
  private readonly NOTICE_THROTTLE_MS = 2000;

  constructor(private settings: PersonaSettings) {}

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

  async runAgent(agent: string, action: string): Promise<ExecutionResult> {
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
    const business = this.settings.business;
    const executionId = `${agent}-${Date.now()}`;
    const startTime = new Date();

    // Track running execution
    this.runningExecutions.set(executionId, { agent, action, startTime });

    return new Promise((resolve) => {
      const childProcess = spawn('bash', [scriptPath, business, agent, action], {
        cwd: this.settings.personaRoot,
        env: { ...process.env },
      });

      let stderr = '';

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        this.runningExecutions.delete(executionId);
        const endTime = new Date();
        const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

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

      childProcess.on('error', (err) => {
        this.runningExecutions.delete(executionId);
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
