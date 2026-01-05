import { App, TFile, TFolder } from 'obsidian';
import { DuplicateMatch, SubjectFolder, PersonaSettings } from '../types';

export class DuplicateDetector {
  constructor(
    private app: App,
    private settings: PersonaSettings
  ) {}

  /**
   * Find potential duplicate notes based on title similarity
   */
  async findDuplicates(title: string): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];
    const zettelPath = this.settings.zettelkastenPath;
    const threshold = this.settings.duplicateThreshold;

    // Get all markdown files in Zettelkasten folder
    const zettelFolder = this.app.vault.getAbstractFileByPath(zettelPath);
    if (!zettelFolder || !(zettelFolder instanceof TFolder)) {
      return matches;
    }

    const files = this.getAllMarkdownFiles(zettelFolder);
    const normalizedTitle = this.normalizeString(title);

    for (const file of files) {
      // Skip index files for matching
      if (file.basename === 'index') continue;

      const normalizedFileName = this.normalizeString(file.basename);
      const score = this.calculateSimilarity(normalizedTitle, normalizedFileName);

      if (score >= threshold) {
        matches.push({
          path: file.path,
          title: file.basename,
          matchScore: score,
          matchType: 'title',
        });
      }
    }

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Find existing subject folders that might be related
   */
  async findRelatedSubjects(title: string): Promise<SubjectFolder[]> {
    const subjects: SubjectFolder[] = [];
    const zettelPath = this.settings.zettelkastenPath;

    const zettelFolder = this.app.vault.getAbstractFileByPath(zettelPath);
    if (!zettelFolder || !(zettelFolder instanceof TFolder)) {
      return subjects;
    }

    const normalizedTitle = this.normalizeString(title);

    // Check each subfolder in Zettelkasten
    for (const child of zettelFolder.children) {
      if (child instanceof TFolder) {
        const subjectMatch = this.checkSubjectFolder(child, normalizedTitle);
        if (subjectMatch) {
          subjects.push(subjectMatch);
        }
      }
    }

    return subjects;
  }

  /**
   * Recursively check a folder and its children for subject matches
   */
  private checkSubjectFolder(folder: TFolder, normalizedTitle: string): SubjectFolder | null {
    const normalizedFolderName = this.normalizeString(folder.name);
    const score = this.calculateSimilarity(normalizedTitle, normalizedFolderName);

    // Check if any word in the title matches the folder name
    const titleWords = normalizedTitle.split(/\s+/);
    const wordMatch = titleWords.some(
      (word) => word.length > 3 && normalizedFolderName.includes(word)
    );

    if (score >= 50 || wordMatch) {
      const noteCount = this.countMarkdownFiles(folder);
      const hasIndex = folder.children.some(
        (c) => c instanceof TFile && c.basename === 'index'
      );

      return {
        path: folder.path,
        name: folder.name,
        noteCount,
        hasIndex,
      };
    }

    return null;
  }

  /**
   * Get all subject folders in Zettelkasten
   */
  async getAllSubjectFolders(): Promise<SubjectFolder[]> {
    const subjects: SubjectFolder[] = [];
    const zettelPath = this.settings.zettelkastenPath;

    const zettelFolder = this.app.vault.getAbstractFileByPath(zettelPath);
    if (!zettelFolder || !(zettelFolder instanceof TFolder)) {
      return subjects;
    }

    this.collectSubjectFolders(zettelFolder, subjects);
    return subjects;
  }

  /**
   * Recursively collect all subject folders
   */
  private collectSubjectFolders(folder: TFolder, subjects: SubjectFolder[]): void {
    for (const child of folder.children) {
      if (child instanceof TFolder) {
        const noteCount = this.countMarkdownFiles(child);
        const hasIndex = child.children.some(
          (c) => c instanceof TFile && c.basename === 'index'
        );

        subjects.push({
          path: child.path,
          name: child.name,
          noteCount,
          hasIndex,
        });

        // Recursively check nested folders
        this.collectSubjectFolders(child, subjects);
      }
    }
  }

  /**
   * Get all markdown files recursively from a folder
   */
  private getAllMarkdownFiles(folder: TFolder): TFile[] {
    const files: TFile[] = [];

    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === 'md') {
        files.push(child);
      } else if (child instanceof TFolder) {
        files.push(...this.getAllMarkdownFiles(child));
      }
    }

    return files;
  }

  /**
   * Count markdown files in a folder (non-recursive)
   */
  private countMarkdownFiles(folder: TFolder): number {
    return folder.children.filter(
      (c) => c instanceof TFile && c.extension === 'md'
    ).length;
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a score from 0-100
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 100;
    if (str1.length === 0 || str2.length === 0) return 0;

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return Math.round(similarity);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create a matrix
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Extract a suggested title from selected text
   */
  extractTitle(content: string): string {
    // Try to find a markdown heading
    const headingMatch = content.match(/^#+\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Try to use the first line if it's short enough
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length <= 60) {
      // Clean up any markdown formatting
      return firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
    }

    // Extract key phrases from content (first 100 chars)
    const snippet = content.slice(0, 100).trim();
    const words = snippet.split(/\s+/).slice(0, 5);
    return words.join(' ') + '...';
  }

  /**
   * Extract suggested tags from content
   */
  extractTags(content: string): string[] {
    const tags: string[] = [];

    // Find existing hashtags in content
    const hashtagMatches = content.match(/#[\w-]+/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map((t) => t.slice(1))); // Remove # prefix
    }

    return [...new Set(tags)]; // Remove duplicates
  }
}
