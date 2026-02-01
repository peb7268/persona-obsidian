import { BaseProvider } from './BaseProvider';
import { ProviderType, ModelTier, ProviderExecutionOptions } from './types';

/**
 * Claude Code CLI Provider
 *
 * Invocation pattern:
 * echo "$prompt" | claude --print --dangerously-skip-permissions --model {model}
 */
export class ClaudeProvider extends BaseProvider {
  readonly type: ProviderType = 'claude';
  readonly displayName = 'Claude Code CLI';

  constructor(executablePath: string = 'claude') {
    super(executablePath);
  }

  /**
   * Map generic model tier to Claude-specific model name
   */
  mapModel(tier: ModelTier | string): string {
    switch (tier) {
      case 'opus':
      case '4-opus':
      case 'claude-opus':
        return 'opus';
      case 'sonnet':
      case '4-sonnet':
      case 'claude-sonnet':
        return 'sonnet';
      case 'haiku':
      case '4-haiku':
      case 'claude-haiku':
        return 'haiku';
      default:
        return 'opus';
    }
  }

  /**
   * Build command-line arguments for Claude CLI
   */
  buildArgs(options: ProviderExecutionOptions): string[] {
    const model = options.model ? this.mapModel(options.model) : 'opus';
    return ['--print', '--dangerously-skip-permissions', '--model', model];
  }

  /**
   * Claude uses stdin for the prompt
   */
  protected usesStdinForPrompt(): boolean {
    return true;
  }
}
