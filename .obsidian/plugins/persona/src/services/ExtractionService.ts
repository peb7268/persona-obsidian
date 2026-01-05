import { App, TFile, TFolder, Notice } from 'obsidian';
import { ExtractionOptions, ExtractionResult, PersonaSettings } from '../types';
import { DuplicateDetector } from './DuplicateDetector';

export class ExtractionService {
  private duplicateDetector: DuplicateDetector;

  constructor(
    private app: App,
    private settings: PersonaSettings
  ) {
    this.duplicateDetector = new DuplicateDetector(app, settings);
  }

  /**
   * Analyze selected content and prepare extraction result
   */
  async analyzeContent(content: string): Promise<ExtractionResult> {
    const title = this.duplicateDetector.extractTitle(content);
    const suggestedTags = this.duplicateDetector.extractTags(content);

    // Find potential duplicates and related subjects
    const duplicates = await this.duplicateDetector.findDuplicates(title);
    const relatedSubjects = await this.duplicateDetector.findRelatedSubjects(title);

    // Determine if this should be a note or subject
    const suggestedType = this.suggestType(content, title);

    return {
      title,
      content,
      suggestedType,
      suggestedTags: [...this.settings.defaultTags, ...suggestedTags],
      duplicates,
      relatedSubjects: relatedSubjects.map((s) => s.path),
    };
  }

  /**
   * Suggest whether content should be a note or subject folder
   */
  private suggestType(content: string, title: string): 'note' | 'subject' {
    // Heuristics for subject detection:
    // 1. Multiple distinct headings suggest multiple concepts
    // 2. Very long content (>500 words) suggests multiple concepts
    // 3. Certain keywords suggest broader topics

    const headingCount = (content.match(/^#+\s/gm) || []).length;
    const wordCount = content.split(/\s+/).length;

    // Subject keywords that suggest broader topics
    const subjectKeywords = [
      'overview',
      'guide',
      'introduction',
      'fundamentals',
      'getting started',
      'best practices',
      'patterns',
    ];

    const hasSubjectKeyword = subjectKeywords.some(
      (kw) =>
        title.toLowerCase().includes(kw) || content.toLowerCase().includes(kw)
    );

    if (headingCount >= 3 || wordCount > 500 || hasSubjectKeyword) {
      return 'subject';
    }

    return 'note';
  }

  /**
   * Extract content to a new Zettelkasten note
   */
  async extractToNote(options: ExtractionOptions): Promise<TFile | null> {
    const { title, content, type, targetPath, tags, sourceFile, enhanceWithAI } =
      options;

    // If linking to existing note, just return the link path
    if (options.linkToExisting) {
      return this.app.vault.getAbstractFileByPath(options.linkToExisting) as TFile;
    }

    try {
      let notePath: string;
      let noteContent: string;

      if (type === 'subject') {
        // Create subject folder with index
        notePath = await this.createSubjectFolder(title, targetPath, tags, content, sourceFile);
      } else {
        // Create atomic note
        notePath = this.buildNotePath(title, targetPath);
        noteContent = this.buildNoteContent(title, content, tags, sourceFile, enhanceWithAI);
        await this.ensureFolderExists(targetPath);
        await this.app.vault.create(notePath, noteContent);

        // Auto-link: If creating note in a subject folder, update its index.md
        if (this.isSubjectFolder(targetPath)) {
          await this.updateSubjectIndex(targetPath, notePath, title);
        }
      }

      new Notice(`Created: ${title}`);
      return this.app.vault.getAbstractFileByPath(notePath) as TFile;
    } catch (error) {
      new Notice(`Failed to create note: ${error}`);
      console.error('Extraction error:', error);
      return null;
    }
  }

  /**
   * Check if a path is a subject folder (has index.md or is a subfolder of Zettelkasten)
   */
  private isSubjectFolder(folderPath: string): boolean {
    // A subject folder is any folder inside Zettelkasten that is not the root
    const zettelPath = this.settings.zettelkastenPath;
    if (folderPath === zettelPath) {
      return false; // Root Zettelkasten folder is not a subject
    }
    if (!folderPath.startsWith(zettelPath)) {
      return false; // Outside Zettelkasten
    }
    // It's a subfolder of Zettelkasten - treat as subject folder
    return true;
  }

  /**
   * Create a subject folder with index.md
   */
  private async createSubjectFolder(
    title: string,
    basePath: string,
    tags: string[],
    content: string,
    sourceFile: string
  ): Promise<string> {
    const folderName = this.sanitizeFileName(title);
    const folderPath = `${basePath}/${folderName}`;

    // Create the folder
    await this.ensureFolderExists(folderPath);

    // Create index.md
    const indexPath = `${folderPath}/index.md`;
    const indexContent = this.buildIndexContent(title, tags, content, sourceFile);
    await this.app.vault.create(indexPath, indexContent);

    return indexPath;
  }

  /**
   * Build content for index.md in a subject folder
   */
  private buildIndexContent(
    title: string,
    tags: string[],
    content: string,
    sourceFile: string
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const tagList = ['subject', ...tags].map((t) => `  - ${t}`).join('\n');

    return `---
type: subject-index
created: ${date}
tags:
${tagList}
---

# ${title}

## Overview
${content}

## Notes in this Subject
<!-- Auto-updated: Notes in this folder will appear here -->

## Related Subjects
<!-- Links to related subject folders -->

---

## Source
Extracted from: [[${sourceFile}]]
`;
  }

  /**
   * Build the full note content with frontmatter
   */
  private buildNoteContent(
    title: string,
    content: string,
    tags: string[],
    sourceFile: string,
    enhanceWithAI: boolean
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const tagList = tags.map((t) => `  - ${t}`).join('\n');

    // For Phase 1, AI enhancement is a placeholder
    const processedContent = enhanceWithAI ? this.enhanceContent(content) : content;

    return `---
type: zettelkasten
created: ${date}
source: "[[${sourceFile}]]"
tags:
${tagList}
---

# ${title}

${processedContent}

---

## Source
Extracted from: [[${sourceFile}]]

## Related
<!-- Add related notes here -->
`;
  }

  /**
   * Placeholder for AI enhancement (Phase 3)
   */
  private enhanceContent(content: string): string {
    // For MVP, just return content as-is
    // Future: integrate with Claude for expansion
    return content;
  }

  /**
   * Build the file path for a note
   */
  private buildNotePath(title: string, basePath: string): string {
    const fileName = this.sanitizeFileName(title);
    return `${basePath}/${fileName}.md`;
  }

  /**
   * Sanitize a string to be used as a file name
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[\\/:*?"<>|]/g, '-') // Replace invalid chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Ensure a folder path exists, creating it if necessary
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      await this.app.vault.createFolder(folderPath);
    }
  }

  /**
   * Remove selected text and add link to Notes section
   */
  async replaceWithLink(
    sourceFile: TFile,
    selectedText: string,
    linkTarget: string,
    linkTitle: string
  ): Promise<void> {
    let content = await this.app.vault.read(sourceFile);

    // 1. Delete the selected text
    content = content.replace(selectedText, '');

    // 2. Build the link with Note: prefix
    const link = `- Note: [[${linkTarget}|${linkTitle}]]`;

    // 3. Find Notes section and append link
    const notesHeadingPattern = /^## Notes\s*$/m;
    const notesMatch = content.match(notesHeadingPattern);

    if (notesMatch && notesMatch.index !== undefined) {
      // Find where to insert (after the heading line)
      const insertPos = notesMatch.index + notesMatch[0].length;
      const beforeNotes = content.slice(0, insertPos);
      const afterNotes = content.slice(insertPos);

      // Skip any existing comment line
      const commentMatch = afterNotes.match(/^\n<!-- [^>]+ -->\n?/);
      if (commentMatch) {
        const afterComment = afterNotes.slice(commentMatch[0].length);
        content = beforeNotes + commentMatch[0] + link + '\n' + afterComment;
      } else {
        content = beforeNotes + '\n' + link + afterNotes;
      }
    } else {
      // Create Notes section at end of file
      content = content.trimEnd() + '\n\n## Notes\n' + link + '\n';
    }

    await this.app.vault.modify(sourceFile, content);
  }

  /**
   * Find the index.md file in a subject folder
   * Returns null if no index exists
   */
  private findSubjectIndex(folderPath: string): TFile | null {
    const indexPath = `${folderPath}/index.md`;
    const indexFile = this.app.vault.getAbstractFileByPath(indexPath);
    if (indexFile instanceof TFile) {
      return indexFile;
    }
    return null;
  }

  /**
   * Update a subject's index.md to include a link to a new note
   */
  async updateSubjectIndex(
    subjectPath: string,
    notePath: string,
    noteTitle: string
  ): Promise<void> {
    const indexFile = this.findSubjectIndex(subjectPath);
    if (!indexFile) {
      // No index.md exists - create a minimal one
      await this.createMinimalIndex(subjectPath);
      // Re-fetch the newly created index
      const newIndex = this.findSubjectIndex(subjectPath);
      if (!newIndex) return;
      await this.addNoteToIndex(newIndex, notePath, noteTitle);
    } else {
      await this.addNoteToIndex(indexFile, notePath, noteTitle);
    }
  }

  /**
   * Create a minimal index.md for an existing folder
   */
  private async createMinimalIndex(folderPath: string): Promise<void> {
    const folderName = folderPath.split('/').pop() || 'Subject';
    const date = new Date().toISOString().split('T')[0];
    const content = `---
type: subject-index
created: ${date}
tags:
  - subject
---

# ${folderName}

## Overview
<!-- Add overview here -->

## Notes in this Subject
<!-- Auto-updated: Notes in this folder will appear here -->

## Related Subjects
<!-- Links to related subject folders -->
`;
    const indexPath = `${folderPath}/index.md`;
    await this.app.vault.create(indexPath, content);
  }

  /**
   * Add a note link to an existing index.md
   */
  private async addNoteToIndex(
    indexFile: TFile,
    notePath: string,
    noteTitle: string
  ): Promise<void> {
    const content = await this.app.vault.read(indexFile);

    // Build the link (without .md extension for wiki links)
    const linkPath = notePath.replace(/\.md$/, '');
    const noteLink = `- [[${linkPath}|${noteTitle}]]`;

    // Check if this note is already linked (avoid duplicates)
    if (content.includes(`[[${linkPath}`) || content.includes(`[[${notePath}`)) {
      return; // Already linked
    }

    // Find the "Notes in this Subject" section and add the link
    const sectionMarker = '## Notes in this Subject';
    const sectionIndex = content.indexOf(sectionMarker);

    if (sectionIndex === -1) {
      // Section doesn't exist - append to end
      const newContent = content + `\n${sectionMarker}\n${noteLink}\n`;
      await this.app.vault.modify(indexFile, newContent);
    } else {
      // Find the end of the section (next ## or end of file)
      const afterSection = content.slice(sectionIndex + sectionMarker.length);
      const nextSectionMatch = afterSection.match(/\n## /);
      const insertPosition = nextSectionMatch
        ? sectionIndex + sectionMarker.length + (nextSectionMatch.index || 0)
        : content.length;

      // Find where to insert the link (after the comment placeholder if present)
      const commentEnd = afterSection.indexOf('-->');
      let actualInsertPos: number;
      if (commentEnd !== -1 && (nextSectionMatch === null || commentEnd < (nextSectionMatch.index || Infinity))) {
        actualInsertPos = sectionIndex + sectionMarker.length + commentEnd + 3;
      } else {
        // Insert right after the section header
        actualInsertPos = sectionIndex + sectionMarker.length;
      }

      const newContent =
        content.slice(0, actualInsertPos) +
        `\n${noteLink}` +
        content.slice(actualInsertPos);

      await this.app.vault.modify(indexFile, newContent);
    }
  }

  /**
   * Get the DuplicateDetector instance
   */
  getDuplicateDetector(): DuplicateDetector {
    return this.duplicateDetector;
  }
}
