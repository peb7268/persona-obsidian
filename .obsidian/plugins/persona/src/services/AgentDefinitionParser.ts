import * as fs from 'fs';
import { ProviderType, ModelTier, AgentProviderOverride } from '../providers/types';

/**
 * Parsed agent definition from frontmatter
 */
export interface ParsedAgentDefinition {
  name: string;
  role: string;
  tier: string;
  model?: ModelTier | string;
  provider?: ProviderType;
  priority?: string;
  tools?: string[];
  schedule?: {
    cron: string;
    action: string;
    enabled: boolean;
  }[];
}

/**
 * AgentDefinitionParser - Parse agent markdown files
 *
 * Extracts frontmatter from agent definition files to get:
 * - model: The model tier (opus, sonnet, haiku, etc.)
 * - provider: Provider override (claude, gemini, jules)
 * - Other agent metadata (name, role, tier, etc.)
 */
export class AgentDefinitionParser {
  /**
   * Parse agent definition file
   */
  parseAgentFile(filePath: string): ParsedAgentDefinition | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return this.parseFrontmatter(content);
    } catch (err) {
      console.error(`Failed to parse agent definition: ${filePath}`, err);
      return null;
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): ParsedAgentDefinition | null {
    // Match frontmatter between --- delimiters
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    const result: ParsedAgentDefinition = {
      name: '',
      role: '',
      tier: '',
    };

    const lines = frontmatter.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case 'name':
          result.name = value;
          break;
        case 'role':
          result.role = value;
          break;
        case 'tier':
          result.tier = value;
          break;
        case 'model':
          result.model = value as ModelTier;
          break;
        case 'provider':
          result.provider = value as ProviderType;
          break;
        case 'priority':
          result.priority = value;
          break;
      }
    }

    return result;
  }

  /**
   * Get provider override settings from agent definition
   */
  getProviderOverride(agentPath: string): AgentProviderOverride {
    const def = this.parseAgentFile(agentPath);
    return {
      provider: def?.provider,
      model: def?.model,
    };
  }

  /**
   * Build path to agent definition file
   */
  buildAgentPath(personaRoot: string, business: string, agent: string): string {
    return `${personaRoot}/instances/${business}/agents/${agent}.md`;
  }

  /**
   * Check if agent definition file exists
   */
  agentExists(personaRoot: string, business: string, agent: string): boolean {
    const path = this.buildAgentPath(personaRoot, business, agent);
    return fs.existsSync(path);
  }
}
