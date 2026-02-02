import { ProviderType, ProviderConfig, ProvidersSettings, DEFAULT_PROVIDER_CONFIGS } from './providers/types';
import { RoutingConfig, DEFAULT_ROUTING_CONFIG } from './services/RoutingService';

// Re-export for convenience
export type { RoutingConfig } from './services/RoutingService';

export interface PersonaSettings {
  personaRoot: string;
  business: string;
  showRibbonIcon: boolean;
  showStatusBar: boolean;
  // Auto-processing settings
  autoProcessOnSave: boolean;
  pollingEnabled: boolean;
  pollingIntervalMinutes: number;
  // Extraction settings
  zettelkastenPath: string;
  duplicateThreshold: number;
  autoDetectType: boolean;
  showConfirmModal: boolean;
  defaultTags: string[];
  // Provider settings (Phase 2.5)
  providers: ProvidersSettings;
  defaultProvider: ProviderType;
  // Routing settings (header-based instance selection)
  routing: RoutingConfig;
  // Python bridge settings
  pythonPath: string;
  // Supabase settings (for job queue)
  supabaseUrl: string;
  supabaseKey: string;
  // Job queue settings
  hungThresholdMinutes: number;
}

export const DEFAULT_SETTINGS: PersonaSettings = {
  personaRoot: '/Users/pbarrick/Documents/Main/Projects/Persona',
  business: 'PersonalMCO',
  showRibbonIcon: true,
  showStatusBar: true,
  // Auto-processing defaults
  autoProcessOnSave: false,
  pollingEnabled: false,
  pollingIntervalMinutes: 15,
  // Extraction defaults
  zettelkastenPath: 'Resources/Zettlekasten',
  duplicateThreshold: 80,
  autoDetectType: true,
  showConfirmModal: true,
  defaultTags: ['zettelkasten'],
  // Provider defaults (Phase 2.5)
  providers: DEFAULT_PROVIDER_CONFIGS,
  defaultProvider: 'claude',
  // Routing defaults
  routing: DEFAULT_ROUTING_CONFIG,
  // Python bridge defaults
  pythonPath: '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3',
  // Supabase defaults (local instance)
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseKey: '',
  // Job queue defaults
  hungThresholdMinutes: 5,
};

export interface AgentDefinition {
  name: string;
  role: string;
  tier: 'executive' | 'management' | 'specialist' | 'support';
  actions: string[];
}

export interface ExecutionResult {
  success: boolean;
  agent: string;
  action: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
}

export interface SyntaxMatch {
  type: 'research-question' | 'agent-task' | 'queued-task';
  content: string;
  line: number;
}

// Available agents and their actions for MHM instance
export const MHM_AGENTS: AgentDefinition[] = [
  {
    name: 'assistant',
    role: 'Executive Assistant',
    tier: 'support',
    actions: ['morning-briefing', 'evening-summary'],
  },
  {
    name: 'ceo',
    role: 'Chief Executive Officer',
    tier: 'executive',
    actions: ['weekly-review', 'monthly-review'],
  },
  {
    name: 'cro',
    role: 'Chief Revenue Officer',
    tier: 'executive',
    actions: ['daily-pipeline-review', 'weekly-forecast'],
  },
  {
    name: 'director',
    role: 'Director of Operations',
    tier: 'management',
    actions: ['coordinate-tasks'],
  },
  {
    name: 'researcher',
    role: 'Research Analyst',
    tier: 'specialist',
    actions: ['process-research-queue'],
  },
  {
    name: 'project-manager',
    role: 'Project Manager',
    tier: 'management',
    actions: ['daily-project-review', 'weekly-status-report'],
  },
];

// Extraction types
export interface ExtractionResult {
  title: string;
  content: string;
  suggestedType: 'note' | 'subject';
  suggestedTags: string[];
  duplicates: DuplicateMatch[];
  relatedSubjects: string[];
}

export interface DuplicateMatch {
  path: string;
  title: string;
  matchScore: number; // 0-100
  matchType: 'title' | 'content' | 'tags';
}

export interface SubjectFolder {
  path: string;
  name: string;
  noteCount: number;
  hasIndex: boolean;
}

export interface ExtractionOptions {
  title: string;
  content: string;
  type: 'note' | 'subject';
  targetPath: string;
  tags: string[];
  sourceFile: string;
  sourceLine?: number;
  enhanceWithAI: boolean;
  linkToExisting?: string; // Path to existing note to link instead of create
}

// Progress tracking for agent execution
export interface ProgressState {
  agent: string;
  action: string;
  status: 'running' | 'completed' | 'failed' | 'success' | 'timeout';
  started: string;
  ended?: string;
  questions_total: number;
  questions_completed: number;
  current_activity: string;
  last_updated: string;
}
