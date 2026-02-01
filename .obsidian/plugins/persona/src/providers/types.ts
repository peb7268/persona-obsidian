/**
 * Provider Types - TypeScript Provider Abstraction Layer
 *
 * Part of OpenSpec Phase 2.5 implementation
 */

/**
 * Supported AI provider types
 */
export type ProviderType = 'claude' | 'gemini' | 'jules';

/**
 * Generic model tier for cross-provider compatibility
 */
export type ModelTier = 'opus' | 'sonnet' | 'haiku' | 'flash' | 'pro';

/**
 * Provider-specific execution options
 */
export interface ProviderExecutionOptions {
  prompt: string;
  model?: string;
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

/**
 * Result of a provider execution
 */
export interface ProviderExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timedOut: boolean;
}

/**
 * Provider configuration from settings
 */
export interface ProviderConfig {
  type: ProviderType;
  path: string;
  defaultModel: string;
  enabled: boolean;
}

/**
 * Provider settings structure for PersonaSettings
 */
export interface ProvidersSettings {
  claude: ProviderConfig;
  gemini: ProviderConfig;
  jules: ProviderConfig;
}

/**
 * Agent-level provider override from frontmatter
 */
export interface AgentProviderOverride {
  provider?: ProviderType;
  model?: ModelTier | string;
}

/**
 * Base interface all providers must implement
 */
export interface IProvider {
  readonly type: ProviderType;
  readonly displayName: string;

  /**
   * Check if provider executable is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Map generic model tier to provider-specific model name
   */
  mapModel(tier: ModelTier | string): string;

  /**
   * Execute a prompt with the provider
   */
  execute(options: ProviderExecutionOptions): Promise<ProviderExecutionResult>;

  /**
   * Build command-line arguments for this provider
   */
  buildArgs(options: ProviderExecutionOptions): string[];
}

/**
 * Default provider configurations
 */
export const DEFAULT_PROVIDER_CONFIGS: ProvidersSettings = {
  claude: {
    type: 'claude',
    path: 'claude',
    defaultModel: 'opus',
    enabled: true,
  },
  gemini: {
    type: 'gemini',
    path: 'gemini',
    defaultModel: 'gemini-2.0-flash',
    enabled: false,
  },
  jules: {
    type: 'jules',
    path: 'jules',
    defaultModel: 'jules',
    enabled: false,
  },
};
