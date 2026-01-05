import { SyntaxMatch } from '../types';

export class SyntaxParser {
  /**
   * Parse content for research question markers: [?] question text
   * Returns array of matches with line numbers and question content
   */
  parse(content: string): SyntaxMatch[] {
    const matches: SyntaxMatch[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      // Match [?] anywhere in line, handling markdown list prefixes (*, -, +, numbers)
      const match = lines[i].match(/^(?:\s*(?:[-*+]|\d+\.)\s*)?\[\?\]\s*(.+)$/);
      if (match) {
        matches.push({
          type: 'research-question',
          content: match[1].trim(),
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
    return this.parse(content).length;
  }

  /**
   * Extract just the question strings from content
   */
  getQuestions(content: string): string[] {
    return this.parse(content).map((m) => m.content);
  }
}
