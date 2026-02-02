import { MCPClientService, MCPConnectionState, MCPServerConfig } from '../MCPClientService';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

describe('MCPClientService', () => {
  let service: MCPClientService;
  let mockConfig: MCPServerConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockConfig = {
      name: 'ical',
      command: 'uvx',
      args: ['mcp-ical'],
      enabled: true,
    };

    service = new MCPClientService();
  });

  afterEach(async () => {
    // Clean up any connections
    await service.disconnect();
  });

  /**
   * Helper function to create a mock process
   */
  function createMockProcess(): any {
    const mockProcess = new EventEmitter();
    mockProcess.stdin = {
      write: jest.fn(),
    };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();

    return mockProcess;
  }

  describe('getState', () => {
    it('should return DISCONNECTED initially', () => {
      expect(service.getState()).toBe(MCPConnectionState.DISCONNECTED);
    });
  });

  describe('isConnected', () => {
    it('should return false when disconnected', () => {
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should spawn process with correct command', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Start connection (don't await - it will timeout)
      const connectPromise = service.connect(mockConfig);

      // Verify spawn was called correctly
      expect(spawn).toHaveBeenCalledWith(
        'uvx',
        ['mcp-ical'],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      );

      // Simulate successful initialization response
      setImmediate(() => {
        const response = {
          jsonrpc: '2.0',
          id: '1',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
          },
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      });

      await connectPromise;
      expect(service.isConnected()).toBe(true);
    });

    it('should reject on spawn error (command not found)', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const connectPromise = service.connect(mockConfig);

      setImmediate(() => {
        const error = new Error('spawn ENOENT');
        mockProcess.emit('error', error);
      });

      await expect(connectPromise).rejects.toThrow('uvx not found');
      expect(service.getState()).toBe(MCPConnectionState.ERROR);
    });

    it('should detect permission denied error', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const connectPromise = service.connect(mockConfig);

      setImmediate(() => {
        mockProcess.stderr.emit('data', 'Calendar access denied by TCC');
      });

      await expect(connectPromise).rejects.toThrow('Calendar access denied');
      expect(service.getState()).toBe(MCPConnectionState.PERMISSION_DENIED);
    });

    it('should reject on process close with non-zero exit', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const connectPromise = service.connect(mockConfig);

      setImmediate(() => {
        mockProcess.emit('close', 1);
      });

      await expect(connectPromise).rejects.toThrow('exited with code 1');
      expect(service.getState()).toBe(MCPConnectionState.ERROR);
    });

    it('should disconnect existing connection before reconnecting', async () => {
      const mockProcess1 = createMockProcess();
      const mockProcess2 = createMockProcess();
      let callCount = 0;
      (spawn as jest.Mock).mockImplementation(() => {
        return callCount++ === 0 ? mockProcess1 : mockProcess2;
      });

      // First connection
      const connect1 = service.connect(mockConfig);
      setImmediate(() => {
        const response = {
          jsonrpc: '2.0',
          id: '1',
          result: { protocolVersion: '2024-11-05' },
        };
        mockProcess1.stdout.emit('data', JSON.stringify(response) + '\n');
      });
      await connect1;

      // Second connection should kill first process
      const connect2 = service.connect(mockConfig);
      setImmediate(() => {
        const response = {
          jsonrpc: '2.0',
          id: '2',
          result: { protocolVersion: '2024-11-05' },
        };
        mockProcess2.stdout.emit('data', JSON.stringify(response) + '\n');
      });
      await connect2;

      expect(mockProcess1.kill).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should kill process and set state to disconnected', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Connect first
      const connectPromise = service.connect(mockConfig);
      setImmediate(() => {
        const response = {
          jsonrpc: '2.0',
          id: '1',
          result: { protocolVersion: '2024-11-05' },
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      });
      await connectPromise;

      // Disconnect
      await service.disconnect();

      expect(mockProcess.kill).toHaveBeenCalled();
      expect(service.getState()).toBe(MCPConnectionState.DISCONNECTED);
    });
  });

  describe('callTool', () => {
    it('should return error when not connected', async () => {
      const result = await service.callTool('get_events', { date: '2026-02-01' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected to MCP server');
    });

    it('should send JSON-RPC request and return result', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Connect
      const connectPromise = service.connect(mockConfig);
      setImmediate(() => {
        const initResponse = {
          jsonrpc: '2.0',
          id: '1',
          result: { protocolVersion: '2024-11-05' },
        };
        mockProcess.stdout.emit('data', JSON.stringify(initResponse) + '\n');
      });
      await connectPromise;

      // Call tool
      const toolPromise = service.callTool('get_events', { date: '2026-02-01' });

      // Simulate tool response
      setImmediate(() => {
        const toolResponse = {
          jsonrpc: '2.0',
          id: '2',
          result: {
            content: [{ type: 'text', text: 'Event data' }],
          },
        };
        mockProcess.stdout.emit('data', JSON.stringify(toolResponse) + '\n');
      });

      const result = await toolPromise;

      expect(result.success).toBe(true);
      expect(result.result).toEqual([{ type: 'text', text: 'Event data' }]);

      // Verify the request was sent correctly
      expect(mockProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"method":"tools/call"')
      );
    });

    it('should handle tool call error response', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Connect
      const connectPromise = service.connect(mockConfig);
      setImmediate(() => {
        const initResponse = {
          jsonrpc: '2.0',
          id: '1',
          result: { protocolVersion: '2024-11-05' },
        };
        mockProcess.stdout.emit('data', JSON.stringify(initResponse) + '\n');
      });
      await connectPromise;

      // Call tool
      const toolPromise = service.callTool('invalid_tool', {});

      // Simulate error response
      setImmediate(() => {
        const errorResponse = {
          jsonrpc: '2.0',
          id: '2',
          error: {
            code: -32601,
            message: 'Method not found',
          },
        };
        mockProcess.stdout.emit('data', JSON.stringify(errorResponse) + '\n');
      });

      const result = await toolPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Method not found');
    });
  });

  describe('listTools', () => {
    it('should return empty array when not connected', async () => {
      const tools = await service.listTools();

      expect(tools).toEqual([]);
    });

    it('should return list of tool names', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Connect
      const connectPromise = service.connect(mockConfig);
      setImmediate(() => {
        const initResponse = {
          jsonrpc: '2.0',
          id: '1',
          result: { protocolVersion: '2024-11-05' },
        };
        mockProcess.stdout.emit('data', JSON.stringify(initResponse) + '\n');
      });
      await connectPromise;

      // List tools
      const listPromise = service.listTools();

      setImmediate(() => {
        const listResponse = {
          jsonrpc: '2.0',
          id: '2',
          result: {
            tools: [
              { name: 'get_events', description: 'Get calendar events' },
              { name: 'list_calendars', description: 'List all calendars' },
            ],
          },
        };
        mockProcess.stdout.emit('data', JSON.stringify(listResponse) + '\n');
      });

      const tools = await listPromise;

      expect(tools).toEqual(['get_events', 'list_calendars']);
    });
  });

  describe('testConnection', () => {
    it('should return connected=false when no config', async () => {
      const result = await service.testConnection();

      expect(result.connected).toBe(false);
      expect(result.error).toBe('No configuration provided');
    });
  });

  describe('configFromSettings', () => {
    it('should create config from settings', () => {
      const settings = {
        enabled: true,
        command: 'uvx',
        args: ['mcp-ical'],
        enabledCalendars: [],
      };

      const config = MCPClientService.configFromSettings(settings);

      expect(config).toEqual({
        name: 'ical',
        command: 'uvx',
        args: ['mcp-ical'],
        enabled: true,
      });
    });
  });

  describe('error detection', () => {
    it('should detect ENOENT as not installed', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const connectPromise = service.connect(mockConfig);

      setImmediate(() => {
        mockProcess.emit('error', new Error('spawn ENOENT'));
      });

      await expect(connectPromise).rejects.toThrow('uvx not found');
    });

    it('should detect "not authorized" as permission error', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const connectPromise = service.connect(mockConfig);

      setImmediate(() => {
        mockProcess.stderr.emit('data', 'Operation not authorized');
      });

      await expect(connectPromise).rejects.toThrow('Calendar access denied');
    });
  });

  describe('partial JSON handling', () => {
    it('should handle JSON split across multiple data events', async () => {
      const mockProcess = createMockProcess();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Connect
      const connectPromise = service.connect(mockConfig);

      // Simulate response split across two data events
      setImmediate(() => {
        const response = '{"jsonrpc":"2.0","id":"1","result":{"protocolVersion":"2024-11-05"}}';
        mockProcess.stdout.emit('data', response.substring(0, 30));
        mockProcess.stdout.emit('data', response.substring(30) + '\n');
      });

      await connectPromise;
      expect(service.isConnected()).toBe(true);
    });
  });
});
