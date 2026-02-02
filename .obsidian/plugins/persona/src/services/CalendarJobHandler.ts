/**
 * CalendarJobHandler - Process calendar_fetch jobs directly.
 *
 * Fetches calendar events and creates meeting notes in Obsidian.
 */

import { App, TFile, TFolder } from 'obsidian';
import { CalendarFetchService, CalendarEvent } from './CalendarFetchService';
import { JobQueueService, JobInfo } from './JobQueueService';
import { CalendarLogger } from './CalendarLogger';
import { PersonaSettings } from '../types';

export interface CalendarJobResult {
  success: boolean;
  eventsProcessed: number;
  notesCreated: string[];
  notesSkipped: string[];
  error?: string;
}

// Meeting category keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '1to1': ['1:1', '1on1', '1-on-1', 'one on one'],
  'Scrum': ['standup', 'retro', 'retrospective', 'sprint', 'planning', 'grooming', 'refinement'],
  'Leadership': ['leadership', 'exec', 'staff', 'all-hands', 'all hands', 'town hall'],
  'PandE': ['product', 'engineering', 'p&e', 'pande', 'tech sync', 'architecture'],
};

/**
 * Handler for calendar_fetch job type.
 *
 * Processes calendar jobs directly in TypeScript without spawning
 * an external agent process.
 */
export class CalendarJobHandler {
  constructor(
    private app: App,
    private calendarFetchService: CalendarFetchService,
    private jobQueueService: JobQueueService,
    private logger: CalendarLogger,
    private settings: PersonaSettings
  ) {}

  /**
   * Handle a calendar_fetch job.
   */
  async handleJob(job: JobInfo): Promise<CalendarJobResult> {
    const { date, calendars } = job.payload || {};

    // Parse date or use today
    const targetDate = date ? new Date(date) : new Date();

    // Fetch events
    const fetchResult = await this.calendarFetchService.fetchEventsForDate(
      targetDate,
      { calendars }
    );

    if (!fetchResult.success) {
      return {
        success: false,
        eventsProcessed: 0,
        notesCreated: [],
        notesSkipped: [],
        error: fetchResult.error,
      };
    }

    // Create meeting notes
    const notesCreated: string[] = [];
    const notesSkipped: string[] = [];

    for (const event of fetchResult.events) {
      const result = await this.createMeetingNote(event, targetDate);
      if (result.created) {
        notesCreated.push(result.path);
        this.logger.logMeetingNoteCreated(event.title, result.path);
      } else {
        notesSkipped.push(event.title);
        this.logger.logMeetingNoteSkipped(event.title, result.reason || 'unknown');
      }
    }

    return {
      success: true,
      eventsProcessed: fetchResult.events.length,
      notesCreated,
      notesSkipped,
    };
  }

  /**
   * Create meeting note for an event.
   */
  private async createMeetingNote(
    event: CalendarEvent,
    date: Date
  ): Promise<{ created: boolean; path: string; reason?: string }> {
    const category = this.categorizeEvent(event);
    const dateStr = this.formatDate(date);
    const sanitizedTitle = this.sanitizeFilename(event.title);

    const folderPath = `${this.settings.calendar.meetingNoteFolder}/${category}`;
    const filename = `${dateStr} - ${sanitizedTitle}.md`;
    const fullPath = `${folderPath}/${filename}`;

    // Check if note already exists
    const existingFile = this.app.vault.getAbstractFileByPath(fullPath);
    if (existingFile instanceof TFile) {
      return { created: false, path: fullPath, reason: 'already exists' };
    }

    // Ensure folder exists
    await this.ensureFolderExists(folderPath);

    // Create note content
    const content = this.generateNoteContent(event, dateStr);

    // Create the file
    try {
      await this.app.vault.create(fullPath, content);
      return { created: true, path: fullPath };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.logError('note:create', err instanceof Error ? err : new Error(error));
      return { created: false, path: fullPath, reason: error };
    }
  }

  /**
   * Categorize event based on keywords in title.
   */
  private categorizeEvent(event: CalendarEvent): string {
    const titleLower = event.title.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }

    // Check if it looks like a 1:1 (contains a person's name pattern)
    // Simple heuristic: title is short and doesn't have common meeting words
    const commonMeetingWords = ['meeting', 'sync', 'review', 'call', 'discussion'];
    const hasCommonWord = commonMeetingWords.some(w => titleLower.includes(w));
    if (!hasCommonWord && event.title.split(' ').length <= 4) {
      // Might be a 1:1 with just a name
      return '1to1';
    }

    return 'Ad-Hoc';
  }

  /**
   * Generate meeting note content.
   */
  private generateNoteContent(event: CalendarEvent, dateStr: string): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`date: ${dateStr}`);
    lines.push(`searchableSubject: ${event.title}`);
    lines.push('type: meeting');
    if (event.organizer) {
      lines.push(`organizer: ${event.organizer}`);
    }
    lines.push('---');
    lines.push('');

    // Metadata fields
    if (event.attendees && event.attendees.length > 0) {
      const attendeeLinks = event.attendees.map(a => `[[${a}]]`).join(', ');
      lines.push(`People:: ${attendeeLinks}`);
    }
    lines.push(`Subject:: ${event.title}`);
    lines.push(`Date:: [[Resources/Agenda/Daily/${dateStr}|${dateStr}]]`);

    if (event.location) {
      lines.push(`Location:: ${event.location}`);
    }

    // Time info
    const startTime = this.formatTime(event.startDate);
    const endTime = this.formatTime(event.endDate);
    lines.push(`Time:: ${startTime} - ${endTime}`);

    lines.push('');
    lines.push('## Notes');
    lines.push('');
    lines.push('');
    lines.push('## Action Items');
    lines.push('');
    lines.push('- [ ] ');

    return lines.join('\n');
  }

  /**
   * Ensure folder exists, creating it if necessary.
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (folder instanceof TFolder) {
      return;
    }

    // Create folder hierarchy
    const parts = folderPath.split('/');
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(currentPath);
      if (!existing) {
        await this.app.vault.createFolder(currentPath);
      }
    }
  }

  /**
   * Format date as YYYY-MM-DD.
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format time from ISO string.
   */
  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Sanitize string for use as filename.
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
}
