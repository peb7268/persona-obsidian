import * as fs from 'fs';

/**
 * Routing configuration loaded from env.md
 */
export interface RoutingConfig {
  enabled: boolean;
  defaultInstance: string;
  headerMappings: Record<string, string>; // normalized header -> instance
  maxConcurrentTasks: number; // max concurrent [A] tasks
}

/**
 * Result of routing resolution
 */
export interface RoutingResult {
  instance: string;
  confidence: 'explicit' | 'inferred' | 'default';
  matchedHeader?: string;
}

/**
 * Default routing configuration
 */
export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  enabled: true,
  defaultInstance: 'PersonalMCO',
  headerMappings: {
    mhm: 'MHM',
    personal: 'PersonalMCO',
    mco: 'PersonalMCO',
  },
  maxConcurrentTasks: 2,
};

/**
 * RoutingService - Header-based instance routing
 *
 * Determines which Persona instance (MHM, PersonalMCO) should handle
 * a task based on the H2 header section in the daily note.
 */
export class RoutingService {
  private config: RoutingConfig;

  constructor(config: RoutingConfig) {
    this.config = config;
  }

  /**
   * Load routing config from env.md file
   *
   * Expected format in env.md:
   * ```
   * ## Routing Configuration
   * routing_enabled: true
   * default_instance: PersonalMCO
   * header_mhm: MHM
   * header_personal: PersonalMCO
   * header_mco: PersonalMCO
   * ```
   */
  static loadFromEnv(envPath: string): RoutingConfig {
    const config: RoutingConfig = { ...DEFAULT_ROUTING_CONFIG };

    try {
      if (!fs.existsSync(envPath)) {
        console.warn(`Routing: env.md not found at ${envPath}, using defaults`);
        return config;
      }

      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();

        if (key === 'routing_enabled') {
          config.enabled = value.toLowerCase() === 'true';
        } else if (key === 'default_instance') {
          config.defaultInstance = value;
        } else if (key === 'max_concurrent_tasks') {
          config.maxConcurrentTasks = parseInt(value) || 2;
        } else if (key.startsWith('header_')) {
          // Extract header name from key (e.g., header_mhm -> mhm)
          const headerName = key.substring(7); // Remove 'header_' prefix
          config.headerMappings[headerName] = value;
        }
      }
    } catch (err) {
      console.error('Failed to load routing config from env.md:', err);
    }

    return config;
  }

  /**
   * Resolve which instance should handle a request based on content context
   *
   * @param content - The markdown content (typically daily note)
   * @param cursorLine - Optional line number (1-indexed) for cursor position
   * @returns RoutingResult with instance and confidence level
   */
  resolveInstance(content: string, cursorLine?: number): RoutingResult {
    if (!this.config.enabled) {
      return {
        instance: this.config.defaultInstance,
        confidence: 'default',
      };
    }

    // If cursor line provided, find enclosing header
    if (cursorLine !== undefined) {
      const header = this.findEnclosingHeader(content, cursorLine);
      if (header) {
        const normalizedHeader = this.normalizeHeader(header);
        const instance = this.config.headerMappings[normalizedHeader];
        if (instance) {
          return {
            instance,
            confidence: 'inferred',
            matchedHeader: header,
          };
        }
      }
    }

    // Fall back to default
    return {
      instance: this.config.defaultInstance,
      confidence: 'default',
    };
  }

  /**
   * Find the H2 header that contains the given line number
   *
   * Scans backwards from the cursor line to find the nearest ## header.
   *
   * @param content - Markdown content
   * @param lineNumber - Line number (1-indexed)
   * @returns Header text (without ##) or null if not found
   */
  findEnclosingHeader(content: string, lineNumber: number): string | null {
    const lines = content.split('\n');

    // Scan backwards from cursor position to find nearest H2
    for (let i = Math.min(lineNumber - 1, lines.length - 1); i >= 0; i--) {
      const line = lines[i];
      const match = line.match(/^##\s+(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract all H2 headers from content
   *
   * @param content - Markdown content
   * @returns Array of header texts (without ##)
   */
  extractH2Headers(content: string): string[] {
    const headers: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^##\s+(.+)$/);
      if (match) {
        headers.push(match[1].trim());
      }
    }

    return headers;
  }

  /**
   * Normalize header text for matching
   *
   * - Lowercase
   * - Remove emojis
   * - Trim whitespace
   * - Handle common variations
   */
  private normalizeHeader(header: string): string {
    return (
      header
        .toLowerCase()
        // Remove emojis (common Unicode emoji ranges)
        .replace(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
          ''
        )
        .trim()
        // Handle "MHM Business" -> "mhm"
        .split(/\s+/)[0]
    );
  }

  /**
   * Get the current routing config
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }

  /**
   * Check if routing is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get all configured header mappings
   */
  getHeaderMappings(): Record<string, string> {
    return { ...this.config.headerMappings };
  }
}
