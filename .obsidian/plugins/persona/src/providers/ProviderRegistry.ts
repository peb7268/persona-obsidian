import {
  IProvider,
  ProviderType,
  ProviderConfig,
  ProvidersSettings,
  AgentProviderOverride,
} from './types';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import { JulesProvider } from './JulesProvider';

/**
 * Provider Registry - Manages available AI providers
 *
 * Handles provider initialization, selection, and availability checking.
 */
export class ProviderRegistry {
  private providers: Map<ProviderType, IProvider> = new Map();
  private defaultProvider: ProviderType;
  private availabilityCache: Map<ProviderType, boolean> = new Map();

  constructor(settings: ProvidersSettings, defaultProvider: ProviderType = 'claude') {
    this.defaultProvider = defaultProvider;
    this.initializeProviders(settings);
  }

  /**
   * Initialize providers from settings
   */
  private initializeProviders(settings: ProvidersSettings): void {
    this.providers.clear();

    // Register Claude if enabled
    if (settings.claude.enabled) {
      this.providers.set('claude', new ClaudeProvider(settings.claude.path));
    }

    // Register Gemini if enabled
    if (settings.gemini.enabled) {
      this.providers.set('gemini', new GeminiProvider(settings.gemini.path));
    }

    // Register Jules if enabled
    if (settings.jules.enabled) {
      this.providers.set('jules', new JulesProvider(settings.jules.path));
    }
  }

  /**
   * Reinitialize providers with new settings
   */
  reinitialize(settings: ProvidersSettings, defaultProvider?: ProviderType): void {
    if (defaultProvider) {
      this.defaultProvider = defaultProvider;
    }
    this.availabilityCache.clear();
    this.initializeProviders(settings);
  }

  /**
   * Get provider by type or from agent override
   * Falls back to default provider if not specified or not available
   */
  getProvider(override?: AgentProviderOverride): IProvider {
    const requestedType = override?.provider || this.defaultProvider;
    let provider = this.providers.get(requestedType);

    // If requested provider not available, try default
    if (!provider && requestedType !== this.defaultProvider) {
      provider = this.providers.get(this.defaultProvider);
    }

    // If still no provider, try any available
    if (!provider) {
      for (const p of this.providers.values()) {
        provider = p;
        break;
      }
    }

    if (!provider) {
      throw new Error(
        `No providers available. Requested: ${requestedType}, Default: ${this.defaultProvider}`
      );
    }

    return provider;
  }

  /**
   * Get provider by type (strict)
   */
  getProviderByType(type: ProviderType): IProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get list of registered provider types
   */
  getRegisteredTypes(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check availability of all providers
   * Returns a map of provider type to availability status
   */
  async checkAllAvailability(): Promise<Map<ProviderType, boolean>> {
    const results = new Map<ProviderType, boolean>();

    for (const [type, provider] of this.providers) {
      try {
        const available = await provider.isAvailable();
        results.set(type, available);
        this.availabilityCache.set(type, available);
      } catch {
        results.set(type, false);
        this.availabilityCache.set(type, false);
      }
    }

    return results;
  }

  /**
   * Check availability of a specific provider
   */
  async checkAvailability(type: ProviderType): Promise<boolean> {
    const provider = this.providers.get(type);
    if (!provider) {
      return false;
    }

    try {
      const available = await provider.isAvailable();
      this.availabilityCache.set(type, available);
      return available;
    } catch {
      this.availabilityCache.set(type, false);
      return false;
    }
  }

  /**
   * Get cached availability (from last check)
   */
  getCachedAvailability(type: ProviderType): boolean | undefined {
    return this.availabilityCache.get(type);
  }

  /**
   * Check if any provider is available
   */
  hasAnyProvider(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Get the default provider type
   */
  getDefaultProviderType(): ProviderType {
    return this.defaultProvider;
  }

  /**
   * Set the default provider type
   */
  setDefaultProvider(type: ProviderType): void {
    this.defaultProvider = type;
  }
}
