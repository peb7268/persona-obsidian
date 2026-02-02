/**
 * ServiceManager - Unified lifecycle management for all Persona services
 *
 * Provides:
 * - Coordinated startup with dependency ordering
 * - Graceful shutdown with timeouts
 * - Health checks and readiness probes
 * - Observable lifecycle logging
 */

export type ServiceStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface ManagedService {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy?(): Promise<boolean>;
  getStatus?(): ServiceStatus;
}

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  healthy: boolean;
  lastCheck: Date;
  error?: string;
}

export interface LifecycleEvent {
  timestamp: Date;
  service: string;
  event: 'starting' | 'started' | 'stopping' | 'stopped' | 'error' | 'health_check';
  details?: string;
  durationMs?: number;
}

type LifecycleCallback = (event: LifecycleEvent) => void;

export class ServiceManager {
  private services: Map<string, ManagedService> = new Map();
  private serviceOrder: string[] = [];
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private lifecycleListeners: Set<LifecycleCallback> = new Set();
  private shutdownTimeoutMs = 5000;
  private isShuttingDown = false;

  constructor(private logPrefix = '[ServiceManager]') {}

  /**
   * Register a service to be managed
   * Services are started in registration order and stopped in reverse order
   */
  register(service: ManagedService): void {
    if (this.services.has(service.name)) {
      console.warn(`${this.logPrefix} Service "${service.name}" already registered, replacing`);
    }
    this.services.set(service.name, service);
    this.serviceOrder.push(service.name);
    this.serviceStatuses.set(service.name, 'stopped');
    this.log(`Registered service: ${service.name}`);
  }

  /**
   * Start all registered services in order
   */
  async startAll(): Promise<void> {
    this.log('Starting all services...');
    const startTime = Date.now();

    for (const name of this.serviceOrder) {
      if (this.isShuttingDown) {
        this.log('Shutdown requested during startup, aborting');
        break;
      }
      await this.startService(name);
    }

    const elapsed = Date.now() - startTime;
    this.log(`All services started in ${elapsed}ms`);
  }

  /**
   * Stop all registered services in reverse order
   */
  async stopAll(): Promise<void> {
    if (this.isShuttingDown) {
      this.log('Already shutting down, ignoring duplicate stop request');
      return;
    }

    this.isShuttingDown = true;
    this.log('Stopping all services...');
    const startTime = Date.now();

    // Stop in reverse order of registration
    const reverseOrder = [...this.serviceOrder].reverse();

    for (const name of reverseOrder) {
      await this.stopService(name);
    }

    const elapsed = Date.now() - startTime;
    this.log(`All services stopped in ${elapsed}ms`);
    this.isShuttingDown = false;
  }

  /**
   * Start a single service by name
   */
  async startService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not found`);
    }

    const currentStatus = this.serviceStatuses.get(name);
    if (currentStatus === 'running' || currentStatus === 'starting') {
      this.log(`Service "${name}" already ${currentStatus}, skipping`);
      return;
    }

    this.serviceStatuses.set(name, 'starting');
    this.emitEvent({ timestamp: new Date(), service: name, event: 'starting' });

    const startTime = Date.now();
    try {
      await service.start();
      const durationMs = Date.now() - startTime;
      this.serviceStatuses.set(name, 'running');
      this.emitEvent({ timestamp: new Date(), service: name, event: 'started', durationMs });
      this.log(`Service "${name}" started in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.serviceStatuses.set(name, 'error');
      this.emitEvent({ timestamp: new Date(), service: name, event: 'error', details: errorMsg, durationMs });
      this.log(`Service "${name}" failed to start: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Stop a single service by name with timeout
   */
  async stopService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      return; // Service not registered, nothing to do
    }

    const currentStatus = this.serviceStatuses.get(name);
    if (currentStatus === 'stopped' || currentStatus === 'stopping') {
      return;
    }

    this.serviceStatuses.set(name, 'stopping');
    this.emitEvent({ timestamp: new Date(), service: name, event: 'stopping' });

    const startTime = Date.now();
    try {
      // Race between stop and timeout
      await Promise.race([
        service.stop(),
        this.createTimeout(name),
      ]);
      const durationMs = Date.now() - startTime;
      this.serviceStatuses.set(name, 'stopped');
      this.emitEvent({ timestamp: new Date(), service: name, event: 'stopped', durationMs });
      this.log(`Service "${name}" stopped in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.serviceStatuses.set(name, 'error');
      this.emitEvent({ timestamp: new Date(), service: name, event: 'error', details: errorMsg, durationMs });
      this.log(`Service "${name}" stop error: ${errorMsg}`);
    }
  }

  /**
   * Create a timeout promise for graceful shutdown
   */
  private createTimeout(serviceName: string): Promise<void> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Service "${serviceName}" shutdown timed out after ${this.shutdownTimeoutMs}ms`));
      }, this.shutdownTimeoutMs);
    });
  }

  /**
   * Check health of all services
   */
  async checkHealth(): Promise<ServiceHealth[]> {
    const results: ServiceHealth[] = [];

    for (const [name, service] of this.services) {
      const status = this.serviceStatuses.get(name) || 'stopped';
      let healthy = status === 'running';
      let error: string | undefined;

      // If service has custom health check, use it
      if (service.isHealthy && status === 'running') {
        try {
          healthy = await service.isHealthy();
        } catch (err) {
          healthy = false;
          error = err instanceof Error ? err.message : String(err);
        }
      }

      results.push({
        name,
        status,
        healthy,
        lastCheck: new Date(),
        error,
      });

      this.emitEvent({
        timestamp: new Date(),
        service: name,
        event: 'health_check',
        details: healthy ? 'healthy' : `unhealthy: ${error || status}`,
      });
    }

    return results;
  }

  /**
   * Check if all services are healthy and running
   */
  async isReady(): Promise<boolean> {
    const health = await this.checkHealth();
    return health.every((h) => h.healthy);
  }

  /**
   * Get status of a specific service
   */
  getServiceStatus(name: string): ServiceStatus | undefined {
    return this.serviceStatuses.get(name);
  }

  /**
   * Get status of all services
   */
  getAllStatuses(): Map<string, ServiceStatus> {
    return new Map(this.serviceStatuses);
  }

  /**
   * Register a lifecycle event listener
   */
  onLifecycleEvent(callback: LifecycleCallback): () => void {
    this.lifecycleListeners.add(callback);
    return () => this.lifecycleListeners.delete(callback);
  }

  /**
   * Set shutdown timeout in milliseconds
   */
  setShutdownTimeout(ms: number): void {
    this.shutdownTimeoutMs = ms;
  }

  /**
   * Emit a lifecycle event to all listeners
   */
  private emitEvent(event: LifecycleEvent): void {
    for (const listener of this.lifecycleListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`${this.logPrefix} Lifecycle listener error:`, error);
      }
    }
  }

  /**
   * Log with consistent prefix
   */
  private log(message: string): void {
    console.log(`${this.logPrefix} ${message}`);
  }
}

/**
 * Adapter to wrap existing services that don't implement ManagedService
 */
export function createManagedService(
  name: string,
  startFn: () => Promise<void>,
  stopFn: () => Promise<void>,
  healthFn?: () => Promise<boolean>
): ManagedService {
  return {
    name,
    start: startFn,
    stop: stopFn,
    isHealthy: healthFn,
  };
}
