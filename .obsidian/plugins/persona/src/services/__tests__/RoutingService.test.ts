import { RoutingService, RoutingConfig, DEFAULT_ROUTING_CONFIG } from '../RoutingService';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('RoutingService', () => {
  let service: RoutingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoutingService(DEFAULT_ROUTING_CONFIG);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const config: RoutingConfig = {
        enabled: true,
        defaultInstance: 'CustomInstance',
        headerMappings: { custom: 'CustomInstance' },
        maxConcurrentTasks: 3,
      };

      const svc = new RoutingService(config);

      expect(svc.getConfig().defaultInstance).toBe('CustomInstance');
      expect(svc.getConfig().maxConcurrentTasks).toBe(3);
    });
  });

  describe('loadFromEnv', () => {
    it('should return default config if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = RoutingService.loadFromEnv('/nonexistent/env.md');

      expect(config).toEqual(DEFAULT_ROUTING_CONFIG);
    });

    it('should parse routing_enabled correctly', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('routing_enabled: false');

      const config = RoutingService.loadFromEnv('/test/env.md');

      expect(config.enabled).toBe(false);
    });

    it('should parse default_instance correctly', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('default_instance: MHM');

      const config = RoutingService.loadFromEnv('/test/env.md');

      expect(config.defaultInstance).toBe('MHM');
    });

    it('should parse max_concurrent_tasks correctly', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('max_concurrent_tasks: 5');

      const config = RoutingService.loadFromEnv('/test/env.md');

      expect(config.maxConcurrentTasks).toBe(5);
    });

    it('should parse header mappings correctly', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`
header_sales: MHM
header_business: MHM
header_personal: PersonalMCO
      `);

      const config = RoutingService.loadFromEnv('/test/env.md');

      expect(config.headerMappings.sales).toBe('MHM');
      expect(config.headerMappings.business).toBe('MHM');
      expect(config.headerMappings.personal).toBe('PersonalMCO');
    });

    it('should handle full config file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`
## Routing Configuration
routing_enabled: true
default_instance: PersonalMCO
max_concurrent_tasks: 3
header_mhm: MHM
header_sales: MHM
header_personal: PersonalMCO
      `);

      const config = RoutingService.loadFromEnv('/test/env.md');

      expect(config.enabled).toBe(true);
      expect(config.defaultInstance).toBe('PersonalMCO');
      expect(config.maxConcurrentTasks).toBe(3);
      expect(config.headerMappings.mhm).toBe('MHM');
      expect(config.headerMappings.sales).toBe('MHM');
    });

    it('should handle parse errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const config = RoutingService.loadFromEnv('/test/env.md');

      // Should return default config on error
      expect(config).toEqual(DEFAULT_ROUTING_CONFIG);
    });

    it('should ignore lines without colons', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`
## Header without colon
routing_enabled: true
This is a comment line
default_instance: MHM
      `);

      const config = RoutingService.loadFromEnv('/test/env.md');

      expect(config.enabled).toBe(true);
      expect(config.defaultInstance).toBe('MHM');
    });
  });

  describe('resolveInstance', () => {
    it('should return default when routing is disabled', () => {
      const config: RoutingConfig = {
        ...DEFAULT_ROUTING_CONFIG,
        enabled: false,
        defaultInstance: 'DisabledDefault',
      };
      const svc = new RoutingService(config);

      const result = svc.resolveInstance('## MHM\nSome content', 2);

      expect(result.instance).toBe('DisabledDefault');
      expect(result.confidence).toBe('default');
    });

    it('should resolve instance based on cursor line header', () => {
      const content = `
## MHM
- Task under MHM

## Personal
- Task under Personal
      `;

      const result = service.resolveInstance(content, 3);

      expect(result.instance).toBe('MHM');
      expect(result.confidence).toBe('inferred');
      expect(result.matchedHeader).toBe('MHM');
    });

    it('should resolve Personal header correctly', () => {
      const content = `
## MHM
- Task under MHM

## Personal
- Task under Personal
      `;

      const result = service.resolveInstance(content, 6);

      expect(result.instance).toBe('PersonalMCO');
      expect(result.matchedHeader).toBe('Personal');
    });

    it('should return default when no matching header', () => {
      const content = `
## Unknown Section
- Some task
      `;

      const result = service.resolveInstance(content, 3);

      expect(result.instance).toBe('PersonalMCO');
      expect(result.confidence).toBe('default');
    });

    it('should return default when cursor line is not provided', () => {
      const content = `
## MHM
- Some task
      `;

      const result = service.resolveInstance(content);

      expect(result.instance).toBe('PersonalMCO');
      expect(result.confidence).toBe('default');
    });

    it('should handle MCO header alias', () => {
      const content = `
## MCO
- Task under MCO
      `;

      const result = service.resolveInstance(content, 3);

      expect(result.instance).toBe('PersonalMCO');
    });
  });

  describe('findEnclosingHeader', () => {
    it('should find header on same line', () => {
      const content = `## MHM`;

      const header = service.findEnclosingHeader(content, 1);

      expect(header).toBe('MHM');
    });

    it('should find header above cursor', () => {
      const content = `
## MHM
- Task 1
- Task 2
- Task 3
      `.trim();

      const header = service.findEnclosingHeader(content, 4);

      expect(header).toBe('MHM');
    });

    it('should return nearest H2 header', () => {
      const content = `
## First Header
Content

## Second Header
More content
      `.trim();

      const header = service.findEnclosingHeader(content, 6);

      expect(header).toBe('Second Header');
    });

    it('should return null when no H2 header above', () => {
      const content = `
# H1 Header
Some content
      `.trim();

      const header = service.findEnclosingHeader(content, 3);

      expect(header).toBeNull();
    });

    it('should handle line numbers beyond content', () => {
      const content = '## Header\nLine 2';

      const header = service.findEnclosingHeader(content, 100);

      expect(header).toBe('Header');
    });

    it('should handle empty content', () => {
      const header = service.findEnclosingHeader('', 1);

      expect(header).toBeNull();
    });

    it('should trim header text', () => {
      const content = '##    Header with spaces   ';

      const header = service.findEnclosingHeader(content, 1);

      expect(header).toBe('Header with spaces');
    });
  });

  describe('extractH2Headers', () => {
    it('should extract all H2 headers', () => {
      const content = `
# H1
## First H2
Content
## Second H2
More content
### H3
## Third H2
      `;

      const headers = service.extractH2Headers(content);

      expect(headers).toEqual(['First H2', 'Second H2', 'Third H2']);
    });

    it('should return empty array for no H2 headers', () => {
      const content = `
# Only H1
### Only H3
      `;

      const headers = service.extractH2Headers(content);

      expect(headers).toEqual([]);
    });

    it('should trim header text', () => {
      const content = '##    Spaced Header   ';

      const headers = service.extractH2Headers(content);

      expect(headers).toEqual(['Spaced Header']);
    });
  });

  describe('normalizeHeader (via resolveInstance)', () => {
    it('should handle header with emoji', () => {
      const config: RoutingConfig = {
        ...DEFAULT_ROUTING_CONFIG,
        headerMappings: { mhm: 'MHM' },
      };
      const svc = new RoutingService(config);

      const content = '## \u{1F4BC} MHM Business';

      const result = svc.resolveInstance(content, 1);

      expect(result.instance).toBe('MHM');
    });

    it('should handle header with multiple words', () => {
      const content = '## MHM Business Tasks';

      const result = service.resolveInstance(content, 1);

      expect(result.instance).toBe('MHM');
    });

    it('should be case insensitive', () => {
      const content = '## mhm';

      const result = service.resolveInstance(content, 1);

      expect(result.instance).toBe('MHM');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const config: RoutingConfig = {
        ...DEFAULT_ROUTING_CONFIG,
        enabled: false,
      };
      const svc = new RoutingService(config);

      expect(svc.isEnabled()).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return copy of config', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('getHeaderMappings', () => {
    it('should return copy of header mappings', () => {
      const mappings1 = service.getHeaderMappings();
      const mappings2 = service.getHeaderMappings();

      expect(mappings1).not.toBe(mappings2);
      expect(mappings1).toEqual(mappings2);
    });

    it('should include all configured mappings', () => {
      const mappings = service.getHeaderMappings();

      expect(mappings).toHaveProperty('mhm');
      expect(mappings).toHaveProperty('personal');
      expect(mappings).toHaveProperty('mco');
    });
  });

  describe('DEFAULT_ROUTING_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_ROUTING_CONFIG.enabled).toBe(true);
      expect(DEFAULT_ROUTING_CONFIG.defaultInstance).toBe('PersonalMCO');
      expect(DEFAULT_ROUTING_CONFIG.maxConcurrentTasks).toBe(2);
      expect(DEFAULT_ROUTING_CONFIG.headerMappings.mhm).toBe('MHM');
      expect(DEFAULT_ROUTING_CONFIG.headerMappings.personal).toBe('PersonalMCO');
      expect(DEFAULT_ROUTING_CONFIG.headerMappings.mco).toBe('PersonalMCO');
    });
  });
});
