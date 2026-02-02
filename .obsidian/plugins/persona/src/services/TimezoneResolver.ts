/**
 * TimezoneResolver - Normalize iCal timezone representations.
 *
 * Handles IANA names, Windows names, UTC offsets, and floating time.
 */

export interface TimezoneResolution {
  isoString: string;        // Always ISO8601 with offset
  offsetMinutes: number;    // Offset from UTC in minutes
  originalSpec: string;     // Original timezone string
  wasConverted: boolean;    // True if normalization occurred
  isFloatingTime: boolean;  // True if no explicit timezone
  confidence: 'high' | 'medium' | 'low';
}

// Common Windows to IANA timezone mappings
const WINDOWS_TO_IANA: Record<string, string> = {
  'Eastern Standard Time': 'America/New_York',
  'Eastern Daylight Time': 'America/New_York',
  'Central Standard Time': 'America/Chicago',
  'Central Daylight Time': 'America/Chicago',
  'Mountain Standard Time': 'America/Denver',
  'Mountain Daylight Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles',
  'Pacific Daylight Time': 'America/Los_Angeles',
  'Alaska Standard Time': 'America/Anchorage',
  'Hawaii Standard Time': 'Pacific/Honolulu',
  'UTC': 'UTC',
  'GMT Standard Time': 'Europe/London',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central European Standard Time': 'Europe/Warsaw',
  'Romance Standard Time': 'Europe/Paris',
  'Central Europe Standard Time': 'Europe/Budapest',
  'E. Europe Standard Time': 'Europe/Chisinau',
  'FLE Standard Time': 'Europe/Kiev',
  'GTB Standard Time': 'Europe/Bucharest',
  'Russian Standard Time': 'Europe/Moscow',
  'China Standard Time': 'Asia/Shanghai',
  'Tokyo Standard Time': 'Asia/Tokyo',
  'India Standard Time': 'Asia/Kolkata',
  'AUS Eastern Standard Time': 'Australia/Sydney',
  'New Zealand Standard Time': 'Pacific/Auckland',
};

// UTC offset pattern: +HHMM, -HHMM, +HH:MM, -HH:MM
const UTC_OFFSET_PATTERN = /^([+-])(\d{2}):?(\d{2})$/;

// iCal date-time patterns
const ICAL_DATETIME_PATTERN = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Resolves timezone representations from iCal events.
 *
 * Fallback chain:
 * 1. IANA name (America/Denver) -> Use directly
 * 2. Windows name (Mountain Standard Time) -> Map to IANA
 * 3. UTC offset (-0700) -> Use offset
 * 4. Unknown -> Use system timezone with low confidence
 */
export class TimezoneResolver {
  private systemTimezone: string;
  private systemOffsetMinutes: number;

  constructor() {
    // Get system timezone
    this.systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.systemOffsetMinutes = -new Date().getTimezoneOffset();
  }

  /**
   * Resolve a datetime with timezone specification.
   */
  resolve(dateTime: string, tzSpec: string | null): TimezoneResolution {
    // Handle null/empty timezone as floating time
    if (!tzSpec || tzSpec.trim() === '') {
      return this.resolveFloatingTime(dateTime);
    }

    // Check for UTC indicator
    if (tzSpec.toUpperCase() === 'Z' || tzSpec.toUpperCase() === 'UTC') {
      return this.resolveUTC(dateTime);
    }

    // Check for IANA timezone name
    if (this.isIANATimezone(tzSpec)) {
      return this.resolveIANA(dateTime, tzSpec);
    }

    // Check for Windows timezone name
    const ianaFromWindows = WINDOWS_TO_IANA[tzSpec];
    if (ianaFromWindows) {
      return this.resolveIANA(dateTime, ianaFromWindows, tzSpec, 'medium');
    }

    // Check for UTC offset
    const offsetMatch = tzSpec.match(UTC_OFFSET_PATTERN);
    if (offsetMatch) {
      return this.resolveOffset(dateTime, tzSpec, offsetMatch);
    }

    // Unknown timezone - fall back to system timezone with low confidence
    console.warn(`[TimezoneResolver] Unknown timezone: ${tzSpec}, using system timezone`);
    return this.resolveWithSystemTimezone(dateTime, tzSpec);
  }

  /**
   * Resolve floating time (no timezone specified).
   * Assumes local timezone.
   */
  resolveFloatingTime(dateTime: string): TimezoneResolution {
    const normalizedDateTime = this.normalizeDateTime(dateTime);
    const date = new Date(normalizedDateTime);

    // For floating time, interpret as local time
    const offsetMinutes = this.systemOffsetMinutes;
    const offsetStr = this.formatOffset(offsetMinutes);

    return {
      isoString: normalizedDateTime + offsetStr,
      offsetMinutes,
      originalSpec: '(floating)',
      wasConverted: true,
      isFloatingTime: true,
      confidence: 'medium',
    };
  }

  /**
   * Parse iCal datetime format (YYYYMMDDTHHmmss).
   */
  parseICalDateTime(icalDateTime: string): Date | null {
    const match = icalDateTime.match(ICAL_DATETIME_PATTERN);
    if (!match) {
      return null;
    }

    const [, year, month, day, hour, minute, second, utc] = match;
    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

    if (utc) {
      return new Date(dateStr + 'Z');
    }

    return new Date(dateStr);
  }

  /**
   * Check if two resolutions represent the same moment in time.
   */
  isSameTime(a: TimezoneResolution, b: TimezoneResolution): boolean {
    const dateA = new Date(a.isoString);
    const dateB = new Date(b.isoString);
    return dateA.getTime() === dateB.getTime();
  }

  /**
   * Check if an event time has passed.
   */
  hasPassed(eventTime: TimezoneResolution): boolean {
    const eventDate = new Date(eventTime.isoString);
    return eventDate.getTime() < Date.now();
  }

  /**
   * Get the system timezone.
   */
  getSystemTimezone(): string {
    return this.systemTimezone;
  }

  // ---- Private methods ----

  private resolveUTC(dateTime: string): TimezoneResolution {
    const normalizedDateTime = this.normalizeDateTime(dateTime);

    return {
      isoString: normalizedDateTime + '+00:00',
      offsetMinutes: 0,
      originalSpec: 'UTC',
      wasConverted: false,
      isFloatingTime: false,
      confidence: 'high',
    };
  }

  private resolveIANA(
    dateTime: string,
    ianaZone: string,
    originalSpec?: string,
    confidence: 'high' | 'medium' = 'high'
  ): TimezoneResolution {
    const normalizedDateTime = this.normalizeDateTime(dateTime);

    try {
      // Create date in the specified timezone
      const date = new Date(normalizedDateTime);

      // Get offset for this specific date/time in this timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: ianaZone,
        hour: 'numeric',
        timeZoneName: 'longOffset',
      });

      const parts = formatter.formatToParts(date);
      const offsetPart = parts.find(p => p.type === 'timeZoneName');
      const offsetStr = offsetPart?.value || '+00:00';

      // Parse offset from format "GMT-07:00" or similar
      const offsetMatch = offsetStr.match(/([+-]\d{2}):?(\d{2})/);
      const offsetMinutes = offsetMatch
        ? parseInt(offsetMatch[1]) * 60 + (offsetMatch[1][0] === '-' ? -1 : 1) * parseInt(offsetMatch[2])
        : 0;

      return {
        isoString: normalizedDateTime + this.formatOffset(offsetMinutes),
        offsetMinutes,
        originalSpec: originalSpec || ianaZone,
        wasConverted: !!originalSpec,
        isFloatingTime: false,
        confidence,
      };
    } catch (err) {
      // If IANA lookup fails, fall back to system timezone
      console.warn(`[TimezoneResolver] Failed to resolve IANA timezone ${ianaZone}:`, err);
      return this.resolveWithSystemTimezone(dateTime, originalSpec || ianaZone);
    }
  }

  private resolveOffset(
    dateTime: string,
    originalSpec: string,
    match: RegExpMatchArray
  ): TimezoneResolution {
    const normalizedDateTime = this.normalizeDateTime(dateTime);

    const sign = match[1] === '-' ? -1 : 1;
    const hours = parseInt(match[2]);
    const minutes = parseInt(match[3]);
    const offsetMinutes = sign * (hours * 60 + minutes);

    return {
      isoString: normalizedDateTime + this.formatOffset(offsetMinutes),
      offsetMinutes,
      originalSpec,
      wasConverted: false,
      isFloatingTime: false,
      confidence: 'high',
    };
  }

  private resolveWithSystemTimezone(
    dateTime: string,
    originalSpec: string
  ): TimezoneResolution {
    const normalizedDateTime = this.normalizeDateTime(dateTime);

    return {
      isoString: normalizedDateTime + this.formatOffset(this.systemOffsetMinutes),
      offsetMinutes: this.systemOffsetMinutes,
      originalSpec,
      wasConverted: true,
      isFloatingTime: false,
      confidence: 'low',
    };
  }

  private normalizeDateTime(dateTime: string): string {
    // Already ISO format
    if (ISO_DATETIME_PATTERN.test(dateTime)) {
      // Strip any existing offset/Z
      return dateTime.replace(/([+-]\d{2}:?\d{2}|Z)$/, '');
    }

    // iCal format: YYYYMMDDTHHmmss
    const match = dateTime.match(ICAL_DATETIME_PATTERN);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }

    // Return as-is if we can't parse it
    return dateTime;
  }

  private formatOffset(minutes: number): string {
    const sign = minutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60).toString().padStart(2, '0');
    const mins = (absMinutes % 60).toString().padStart(2, '0');
    return `${sign}${hours}:${mins}`;
  }

  private isIANATimezone(name: string): boolean {
    try {
      Intl.DateTimeFormat('en-US', { timeZone: name });
      return true;
    } catch {
      return false;
    }
  }
}
