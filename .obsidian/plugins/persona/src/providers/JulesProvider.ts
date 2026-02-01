import { BaseProvider } from './BaseProvider';
import { ProviderType, ModelTier, ProviderExecutionOptions } from './types';

/**
 * Jules Tools CLI Provider
 *
 * Invocation pattern:
 * jules task create --description "$prompt" --repo "$cwd"
 *
 * Note: Jules is async - it creates a task and returns immediately.
 * The task is then processed asynchronously via GitHub integration.
 */
export class JulesProvider extends BaseProvider {
  readonly type: ProviderType = 'jules';
  readonly displayName = 'Jules Tools CLI';

  constructor(executablePath: string = 'jules') {
    super(executablePath);
  }

  /**
   * Jules doesn't have model selection - always returns 'jules'
   */
  mapModel(tier: ModelTier | string): string {
    return 'jules';
  }

  /**
   * Build command-line arguments for Jules CLI
   * The prompt is passed as the --description argument, not stdin
   */
  buildArgs(options: ProviderExecutionOptions): string[] {
    const repoPath = options.cwd || process.cwd();
    return ['task', 'create', '--description', options.prompt, '--repo', repoPath];
  }

  /**
   * Jules uses command args for the prompt, not stdin
   */
  protected usesStdinForPrompt(): boolean {
    return false;
  }
}
