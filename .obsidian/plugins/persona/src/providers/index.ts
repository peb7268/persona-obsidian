/**
 * Provider Module - AI Provider Abstraction Layer
 *
 * Part of OpenSpec Phase 2.5 implementation.
 * Provides TypeScript-native provider support for:
 * - Claude Code CLI
 * - Gemini CLI
 * - Jules Tools CLI
 */

// Types and interfaces
export * from './types';

// Base class
export { BaseProvider } from './BaseProvider';

// Provider implementations
export { ClaudeProvider } from './ClaudeProvider';
export { GeminiProvider } from './GeminiProvider';
export { JulesProvider } from './JulesProvider';

// Registry
export { ProviderRegistry } from './ProviderRegistry';
