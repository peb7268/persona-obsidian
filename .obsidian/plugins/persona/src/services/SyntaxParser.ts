import { SyntaxMatch } from '../types';

export class SyntaxParser {
  // Regex patterns for different marker types
  private readonly QUESTION_REGEX = /^(?:\s*(?:[-*+]|\d+\.)\s*)?\[\?\]\s*(.+)$/;
  private readonly AGENT_TASK_REGEX = /^(?:\s*(?:[-*+]|\d+\.)\s*)?\[A\]\s*(.+)$/;
  private readonly QUEUED_TASK_REGEX = /^(?:\s*(?:[-*+]|\d+\.)\s*)?\[Q\]\s*(.+)$/;

  /**
   * Parse content for all marker types: [?] research questions, [A] agent tasks, [Q] queued tasks
   * Returns array of matches with line numbers and content
   */
  parse(content: string): SyntaxMatch[] {
    const matches: SyntaxMatch[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match [?] research question markers
      const questionMatch = line.match(this.QUESTION_REGEX);
      if (questionMatch) {
        matches.push({
          type: 'research-question',
          content: questionMatch[1].trim(),
          line: i + 1,
        });
      }

      // Match [A] agent task markers
      const agentMatch = line.match(this.AGENT_TASK_REGEX);
      if (agentMatch) {
        matches.push({
          type: 'agent-task',
          content: agentMatch[1].trim(),
          line: i + 1,
        });
      }

      // Match [Q] queued task markers
      const queuedMatch = line.match(this.QUEUED_TASK_REGEX);
      if (queuedMatch) {
        matches.push({
          type: 'queued-task',
          content: queuedMatch[1].trim(),
          line: i + 1,
        });
      }
    }

    return matches;
  }

  /**
   * Get count of research questions in content
   */
  countQuestions(content: string): number {
    return this.parse(content).filter((m) => m.type === 'research-question').length;
  }

  /**
   * Extract just the question strings from content
   */
  getQuestions(content: string): string[] {
    return this.parse(content)
      .filter((m) => m.type === 'research-question')
      .map((m) => m.content);
  }

  /**
   * Get count of agent tasks in content
   */
  countAgentTasks(content: string): number {
    return this.parse(content).filter((m) => m.type === 'agent-task').length;
  }

  /**
   * Extract just the agent task strings from content
   */
  getAgentTasks(content: string): string[] {
    return this.parse(content)
      .filter((m) => m.type === 'agent-task')
      .map((m) => m.content);
  }

  /**
   * Get count of queued tasks in content
   */
  countQueuedTasks(content: string): number {
    return this.parse(content).filter((m) => m.type === 'queued-task').length;
  }

  /**
   * Extract just the queued task strings from content
   */
  getQueuedTasks(content: string): string[] {
    return this.parse(content)
      .filter((m) => m.type === 'queued-task')
      .map((m) => m.content);
  }
}
