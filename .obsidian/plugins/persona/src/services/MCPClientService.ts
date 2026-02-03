/**
 * MCPClientService - MCP SDK wrapper for connecting to MCP servers.
 *
 * Manages connection lifecycle, error detection, and tool calls for MCP servers
 * like mcp-ical (calendar integration).
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import { MCPICalSettings } from '../types';

// Connection states for tracking MCP server status
export enum MCPConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  PERMISSION_DENIED = 'permission_denied',
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  enabled: boolean;
}

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface MCPHealthResult {
  connected: boolean;
  serverName: string;
  error?: string;
  permissionDenied?: boolean;
}

/**
 * Service for managing MCP server connections.
 *
 * Uses stdio transport to communicate with MCP servers spawned as child processes.
 * Handles connection lifecycle, error detection, and tool calls.
 */
export class MCPClientService {
  private process: ChildProcess | null = null;
  private state: MCPConnectionState = MCPConnectionState.DISCONNECTED;
  private config: MCPServerConfig | null = null;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private requestId = 0;
  private buffer = '';
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly CONNECTION_TIMEOUT_MS = 10000;
  private readonly CALL_TIMEOUT_MS = 30000;

  /**
   * Get current connection state.
   */
  getState(): MCPConnectionState {
    return this.state;
  }

  /**
   * Check if connected to an MCP server.
   */
  isConnected(): boolean {
    return this.state === MCPConnectionState.CONNECTED;
  }

  /**
   * Check if a command exists on the system.
   * Useful for pre-flight checks before attempting to connect.
   */
  static commandExists(command: string): boolean {
    try {
      // Use 'which' on Unix-like systems
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get install instructions for a missing command.
   */
  static getInstallInstructions(command: string): string {
    const instructions: Record<string, string> = {
      'uvx': 'brew install uv',
      'uv': 'brew install uv',
      'npx': 'Install Node.js from https://nodejs.org',
      'python3': 'brew install python3',
    };
    return instructions[command] || `Install ${command}`;
  }

  /**
   * Get setup instructions for mcp-ical specifically.
   */
  static getMcpIcalSetupInstructions(): string {
    return `mcp-ical setup required:
1. git clone https://github.com/Omar-V2/mcp-ical.git
2. cd mcp-ical && uv sync
3. Update Persona settings with the correct path`;
  }

  /**
   * Get calendar permission instructions for macOS.
   */
  static getCalendarPermissionInstructions(): string {
    return `Calendar access denied. To grant permission:
1. Open System Settings → Privacy & Security → Calendars
2. Click + and navigate to: /Library/Frameworks/Python.framework/Versions/3.12/bin/
3. Select python3.12 and click Open
4. Ensure the checkbox is enabled
5. Restart Terminal and Obsidian`;
  }

  /**
   * Connect to an MCP server.
   */
  async connect(config: MCPServerConfig): Promise<void> {
    if (this.state === MCPConnectionState.CONNECTED) {
      await this.disconnect();
    }

    // Pre-flight check: verify command exists
    if (!MCPClientService.commandExists(config.command)) {
      const installCmd = MCPClientService.getInstallInstructions(config.command);
      this.state = MCPConnectionState.ERROR;
      throw new Error(`${config.command} not found. Install with: ${installCmd}`);
    }

    this.config = config;
    this.state = MCPConnectionState.CONNECTING;

    return new Promise((resolve, reject) => {
      try {
        // Spawn the MCP server process
        this.process = spawn(config.command, config.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        });

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
          this.state = MCPConnectionState.ERROR;
          reject(new Error('Connection timeout: MCP server did not respond'));
          this.cleanup();
        }, this.CONNECTION_TIMEOUT_MS);

        // Handle stdout (JSON-RPC responses)
        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleStdout(data);
        });

        // Handle stderr (errors and logs)
        this.process.stderr?.on('data', (data: Buffer) => {
          const message = data.toString();
          console.warn('[MCP stderr]', message);

          // Detect permission errors
          if (this.detectPermissionError(message)) {
            this.state = MCPConnectionState.PERMISSION_DENIED;
            this.clearConnectionTimeout();
            reject(new Error(MCPClientService.getCalendarPermissionInstructions()));
            this.cleanup();
          }
        });

        // Handle process errors
        this.process.on('error', (err) => {
          this.clearConnectionTimeout();
          if (this.detectNotInstalledError(err)) {
            this.state = MCPConnectionState.ERROR;
            reject(new Error(`${config.command} not found. Install with: brew install uv`));
          } else {
            this.state = MCPConnectionState.ERROR;
            reject(new Error(`Failed to start MCP server: ${err.message}`));
          }
          this.cleanup();
        });

        // Handle process close
        this.process.on('close', (code) => {
          // Only reject if still in CONNECTING state and not already in a terminal error state
          if (this.state === MCPConnectionState.CONNECTING) {
            this.clearConnectionTimeout();
            this.state = MCPConnectionState.ERROR;
            reject(new Error(`MCP server exited with code ${code}`));
            this.cleanup();
          }
        });

        // Send initialization request
        this.sendRequest('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'persona-plugin',
            version: '0.1.0',
          },
        }).then(() => {
          // Send initialized notification
          this.sendNotification('notifications/initialized', {});
          this.clearConnectionTimeout();
          this.state = MCPConnectionState.CONNECTED;
          resolve();
        }).catch((err) => {
          // Only handle if not already in a terminal error state
          // (permission denied or other error handlers may have already run)
          if (this.state === MCPConnectionState.CONNECTING) {
            this.clearConnectionTimeout();
            this.state = MCPConnectionState.ERROR;
            reject(err);
            this.cleanup();
          }
        });
      } catch (err) {
        this.clearConnectionTimeout();
        this.state = MCPConnectionState.ERROR;
        reject(err);
        this.cleanup();
      }
    });
  }

  /**
   * Disconnect from the MCP server.
   */
  async disconnect(): Promise<void> {
    this.cleanup();
    this.state = MCPConnectionState.DISCONNECTED;
  }

  /**
   * Call an MCP tool.
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.isConnected()) {
      return {
        success: false,
        error: 'Not connected to MCP server',
      };
    }

    try {
      const result = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args,
      });

      return {
        success: true,
        result: result.content,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * List available tools from the MCP server.
   */
  async listTools(): Promise<string[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const result = await this.sendRequest('tools/list', {});
      return (result.tools || []).map((t: any) => t.name);
    } catch {
      return [];
    }
  }

  /**
   * Test connection to the MCP server.
   */
  async testConnection(): Promise<MCPHealthResult> {
    if (!this.config) {
      return {
        connected: false,
        serverName: 'unknown',
        error: 'No configuration provided',
      };
    }

    if (!this.isConnected()) {
      try {
        await this.connect(this.config);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return {
          connected: false,
          serverName: this.config.name,
          error,
          permissionDenied: this.state === MCPConnectionState.PERMISSION_DENIED,
        };
      }
    }

    return {
      connected: true,
      serverName: this.config.name,
    };
  }

  /**
   * Create config from settings.
   */
  static configFromSettings(settings: MCPICalSettings): MCPServerConfig {
    return {
      name: 'ical',
      command: settings.command,
      args: settings.args,
      enabled: settings.enabled,
    };
  }

  // ---- Private methods ----

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('MCP server not running'));
        return;
      }

      const id = String(++this.requestId);
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${method}`));
      }, this.CALL_TIMEOUT_MS);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const message = JSON.stringify(request) + '\n';
      this.process.stdin.write(message);
    });
  }

  private sendNotification(method: string, params: any): void {
    if (!this.process?.stdin) {
      return;
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const message = JSON.stringify(notification) + '\n';
    this.process.stdin.write(message);
  }

  private handleStdout(data: Buffer): void {
    this.buffer += data.toString();

    // Process complete JSON lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line);

        if (response.id && this.pendingRequests.has(response.id)) {
          const pending = this.pendingRequests.get(response.id)!;
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);

          if (response.error) {
            pending.reject(new Error(response.error.message || 'Unknown error'));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch {
        // Ignore malformed JSON
      }
    }
  }

  private detectPermissionError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('calendar access') ||
      lowerMessage.includes('access denied') ||
      lowerMessage.includes('tccanverted') ||
      lowerMessage.includes('not authorized')
    );
  }

  private detectNotInstalledError(error: Error): boolean {
    return (
      error.message.includes('ENOENT') ||
      error.message.includes('spawn') ||
      error.message.includes('not found')
    );
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private cleanup(): void {
    this.clearConnectionTimeout();

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    // Kill the process
    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    this.buffer = '';
  }
}
