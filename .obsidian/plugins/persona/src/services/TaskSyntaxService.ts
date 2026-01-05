export class TaskSyntaxService {
  private readonly PRIORITY_EMOJIS = ['🔺', '⏫', '🔼', '🔽', '⏬'];
  private readonly DEFAULT_PRIORITY = '🔼';
  private readonly DUE_EMOJI = '📅';

  /**
   * Enforce Obsidian Tasks plugin syntax on all incomplete tasks
   * - Adds medium priority (🔼) if missing
   * - Adds due date (📅 YYYY-MM-DD) if missing
   * - Normalizes bullets (* → -)
   */
  enforceTaskSyntax(content: string, defaultDate: string): string {
    const lines = content.split('\n');

    return lines
      .map((line) => {
        // Match incomplete tasks: - [ ] or * [ ]
        const taskMatch = line.match(/^(\s*)([*-])\s*\[ \]\s*(.+)$/);
        if (!taskMatch) return line;

        const [, indent, , taskContent] = taskMatch;

        // Skip if already has all required elements
        const hasPriority = this.PRIORITY_EMOJIS.some((e) => taskContent.includes(e));
        const hasDueDate = taskContent.includes(this.DUE_EMOJI);

        if (hasPriority && hasDueDate) return line;

        // Build the new task line
        let newContent = taskContent.trimEnd();

        if (!hasPriority) {
          newContent += ` ${this.DEFAULT_PRIORITY}`;
        }

        if (!hasDueDate) {
          newContent += ` ${this.DUE_EMOJI} ${defaultDate}`;
        }

        return `${indent}- [ ] ${newContent}`;
      })
      .join('\n');
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }
}
