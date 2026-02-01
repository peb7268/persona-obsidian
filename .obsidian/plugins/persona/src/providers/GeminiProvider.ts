import { BaseProvider } from './BaseProvider';
import { ProviderType, ModelTier, ProviderExecutionOptions } from './types';

/**
 * Gemini CLI Provider
 *
 * Invocation pattern:
 * echo "$prompt" | gemini --sandbox false
 *
 * Note: Gemini CLI natively reads AGENTS.md files for context
 */
export class GeminiProvider extends BaseProvider {
  readonly type: ProviderType = 'gemini';
  readonly displayName = 'Gemini CLI';

  constructor(executablePath: string = 'gemini') {
    super(executablePath);
  }

  /**
   * Map generic model tier to Gemini-specific model name
   * Currently all map to gemini-2.0-flash
   */
  mapModel(tier: ModelTier | string): string {
    switch (tier) {
      case 'opus':
      case 'pro':
      case 'gemini-pro':
        return 'gemini-2.0-flash';
      case 'sonnet':
      case 'flash':
      case 'gemini-flash':
        return 'gemini-2.0-flash';
      default:
        return 'gemini-2.0-flash';
    }
  }

  /**
   * Build command-line arguments for Gemini CLI
   */
  buildArgs(options: ProviderExecutionOptions): string[] {
    return ['--sandbox', 'false'];
  }

  /**
   * Gemini uses stdin for the prompt
   */
  protected usesStdinForPrompt(): boolean {
    return true;
  }
}
