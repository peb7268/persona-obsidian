import { spawn, ChildProcess } from 'child_process';
import {
  IProvider,
  ProviderType,
  ModelTier,
  ProviderExecutionOptions,
  ProviderExecutionResult,
} from './types';

/**
 * Abstract base class for AI provider implementations
 *
 * Handles common execution logic including:
 * - Process spawning
 * - Timeout handling (SIGTERM followed by SIGKILL)
 * - stdin/stdout/stderr capture
 * - Availability checking
 */
export abstract class BaseProvider implements IProvider {
  abstract readonly type: ProviderType;
  abstract readonly displayName: string;

  constructor(protected executablePath: string) {}

  /**
   * Map generic model tier to provider-specific model name
   */
  abstract mapModel(tier: ModelTier | string): string;

  /**
   * Build command-line arguments for this provider
   */
  abstract buildArgs(options: ProviderExecutionOptions): string[];

  /**
   * Whether this provider uses stdin for the prompt (vs command args)
   */
  protected usesStdinForPrompt(): boolean {
    return true;
  }

  /**
   * Check if provider executable is available
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proc = spawn(this.executablePath, ['--version'], {
          timeout: 5000,
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));

        // Timeout fallback
        setTimeout(() => {
          try {
            proc.kill();
          } catch {
            // ignore
          }
          resolve(false);
        }, 5000);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Execute a prompt with the provider
   */
  async execute(options: ProviderExecutionOptions): Promise<ProviderExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout || 600000; // 10 minutes default

    return new Promise((resolve) => {
      const args = this.buildArgs(options);
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let proc: ChildProcess;

      try {
        proc = spawn(this.executablePath, args, {
          cwd: options.cwd,
          env: { ...process.env, ...options.env },
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (err) {
        resolve({
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: `Failed to spawn process: ${err}`,
          duration: Date.now() - startTime,
          timedOut: false,
        });
        return;
      }

      // Write prompt to stdin if provider uses it
      if (this.usesStdinForPrompt() && proc.stdin) {
        proc.stdin.write(options.prompt);
        proc.stdin.end();
      }

      // Capture stdout
      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          const text = data.toString();
          stdout += text;
          options.onStdout?.(text);
        });
      }

      // Capture stderr
      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          const text = data.toString();
          stderr += text;
          options.onStderr?.(text);
        });
      }

      // Timeout handler - SIGTERM then SIGKILL
      const timeoutId = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill('SIGTERM');
          // Give 5 seconds for graceful shutdown, then force kill
          setTimeout(() => {
            try {
              proc.kill('SIGKILL');
            } catch {
              // Process already dead
            }
          }, 5000);
        } catch {
          // Process already dead
        }
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0 && !timedOut,
          exitCode: code ?? -1,
          stdout,
          stderr,
          duration: Date.now() - startTime,
          timedOut,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          exitCode: -1,
          stdout,
          stderr: stderr + '\n' + err.message,
          duration: Date.now() - startTime,
          timedOut: false,
        });
      });
    });
  }
}
