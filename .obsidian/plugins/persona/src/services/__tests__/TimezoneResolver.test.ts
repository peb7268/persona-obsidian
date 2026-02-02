import { TimezoneResolver, TimezoneResolution } from '../TimezoneResolver';

describe('TimezoneResolver', () => {
  let resolver: TimezoneResolver;

  beforeEach(() => {
    resolver = new TimezoneResolver();
  });

  describe('resolve', () => {
    describe('IANA timezone names', () => {
      it('should resolve America/New_York', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', 'America/New_York');

        expect(result.wasConverted).toBe(false);
        expect(result.isFloatingTime).toBe(false);
        expect(result.confidence).toBe('high');
        expect(result.originalSpec).toBe('America/New_York');
        expect(result.isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
      });

      it('should resolve America/Denver', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', 'America/Denver');

        expect(result.wasConverted).toBe(false);
        expect(result.confidence).toBe('high');
      });

      it('should resolve UTC', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', 'UTC');

        expect(result.offsetMinutes).toBe(0);
        expect(result.isoString).toContain('+00:00');
        expect(result.confidence).toBe('high');
      });
    });

    describe('Windows timezone names', () => {
      it('should convert Eastern Standard Time to IANA', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', 'Eastern Standard Time');

        expect(result.wasConverted).toBe(true);
        expect(result.confidence).toBe('medium');
        expect(result.originalSpec).toBe('Eastern Standard Time');
      });

      it('should convert Pacific Standard Time to IANA', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', 'Pacific Standard Time');

        expect(result.wasConverted).toBe(true);
        expect(result.confidence).toBe('medium');
      });

      it('should convert Mountain Standard Time to IANA', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', 'Mountain Standard Time');

        expect(result.wasConverted).toBe(true);
        expect(result.confidence).toBe('medium');
      });
    });

    describe('UTC offsets', () => {
      it('should handle +0000', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', '+00:00');

        expect(result.offsetMinutes).toBe(0);
        expect(result.wasConverted).toBe(false);
        expect(result.confidence).toBe('high');
      });

      it('should handle -0700', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', '-07:00');

        expect(result.offsetMinutes).toBe(-420);
        expect(result.wasConverted).toBe(false);
        expect(result.confidence).toBe('high');
      });

      it('should handle +0530 (India)', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', '+05:30');

        expect(result.offsetMinutes).toBe(330);
        expect(result.wasConverted).toBe(false);
        expect(result.confidence).toBe('high');
      });
    });

    describe('unknown timezones', () => {
      it('should fall back to system timezone with low confidence', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', 'Invalid/Timezone');

        expect(result.wasConverted).toBe(true);
        expect(result.confidence).toBe('low');
        expect(result.originalSpec).toBe('Invalid/Timezone');
      });
    });

    describe('Z indicator (UTC)', () => {
      it('should handle Z as UTC', () => {
        const result = resolver.resolve('2026-02-01T14:00:00', 'Z');

        expect(result.offsetMinutes).toBe(0);
        expect(result.isoString).toContain('+00:00');
        expect(result.confidence).toBe('high');
      });
    });
  });

  describe('resolveFloatingTime', () => {
    it('should interpret floating time as local timezone', () => {
      const result = resolver.resolveFloatingTime('2026-02-01T14:00:00');

      expect(result.isFloatingTime).toBe(true);
      expect(result.wasConverted).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.originalSpec).toBe('(floating)');
    });

    it('should resolve null timezone as floating time', () => {
      const result = resolver.resolve('2026-02-01T14:00:00', null);

      expect(result.isFloatingTime).toBe(true);
    });

    it('should resolve empty string timezone as floating time', () => {
      const result = resolver.resolve('2026-02-01T14:00:00', '');

      expect(result.isFloatingTime).toBe(true);
    });
  });

  describe('parseICalDateTime', () => {
    it('should parse iCal format without Z', () => {
      const date = resolver.parseICalDateTime('20260201T140000');

      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(1); // February (0-indexed)
      expect(date?.getDate()).toBe(1);
      expect(date?.getHours()).toBe(14);
      expect(date?.getMinutes()).toBe(0);
    });

    it('should parse iCal format with Z (UTC)', () => {
      const date = resolver.parseICalDateTime('20260201T140000Z');

      expect(date).not.toBeNull();
      // UTC time, so getUTCHours should be 14
      expect(date?.getUTCHours()).toBe(14);
    });

    it('should return null for invalid format', () => {
      const date = resolver.parseICalDateTime('invalid');

      expect(date).toBeNull();
    });
  });

  describe('isSameTime', () => {
    it('should return true for equivalent times in different timezones', () => {
      // 14:00 UTC = 09:00 EST = 07:00 PST
      const utc = resolver.resolve('2026-02-01T14:00:00', 'UTC');
      const est = resolver.resolve('2026-02-01T09:00:00', 'America/New_York');

      // Note: This depends on DST - February is in standard time
      // UTC is 14:00, EST is UTC-5, so 09:00 EST = 14:00 UTC
      expect(resolver.isSameTime(utc, est)).toBe(true);
    });

    it('should return false for different times', () => {
      const time1 = resolver.resolve('2026-02-01T14:00:00', 'UTC');
      const time2 = resolver.resolve('2026-02-01T15:00:00', 'UTC');

      expect(resolver.isSameTime(time1, time2)).toBe(false);
    });
  });

  describe('hasPassed', () => {
    it('should return true for past times', () => {
      const pastTime = resolver.resolve('2020-01-01T00:00:00', 'UTC');

      expect(resolver.hasPassed(pastTime)).toBe(true);
    });

    it('should return false for future times', () => {
      const futureTime = resolver.resolve('2030-01-01T00:00:00', 'UTC');

      expect(resolver.hasPassed(futureTime)).toBe(false);
    });
  });

  describe('getSystemTimezone', () => {
    it('should return a valid IANA timezone name', () => {
      const tz = resolver.getSystemTimezone();

      expect(tz).toBeDefined();
      expect(typeof tz).toBe('string');
      // Should be a valid IANA name (contains a /)
      expect(tz).toMatch(/^[A-Za-z]+\/[A-Za-z_]+/);
    });
  });

  describe('iCal datetime normalization', () => {
    it('should normalize iCal format to ISO', () => {
      const result = resolver.resolve('20260201T140000', 'America/Denver');

      expect(result.isoString).toMatch(/^2026-02-01T14:00:00/);
    });

    it('should handle already normalized ISO format', () => {
      const result = resolver.resolve('2026-02-01T14:00:00', 'America/Denver');

      expect(result.isoString).toMatch(/^2026-02-01T14:00:00/);
    });
  });
});
