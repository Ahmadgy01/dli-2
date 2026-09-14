export type Category =
  | 'Money'
  | 'Deadline'
  | 'Subscription'
  | 'Contract'
  | 'Warranty'
  | 'Return'
  | 'Document'
  | 'Other';

export type SourceType = 'camera' | 'photo' | 'file' | 'manual' | 'demo';

export type RecordStatus = 'active' | 'completed' | 'archived';

export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

/** @deprecated Prefer FactStatus. Kept for backward compatibility. */
export type FactSourceType = 'EXTRACTED' | 'USER_ENTERED' | 'UNKNOWN';

/**
 * Strict fact status for Phase 3.
 * NOT_FOUND means the AI searched and explicitly determined the fact is absent.
 */
export type FactStatus =
  | 'EXTRACTED'
  | 'USER_ENTERED'
  | 'NOT_FOUND'
  | 'NEEDS_CONFIRMATION'
  | 'UNKNOWN';

export interface ExtractedFact {
  field: string;
  value: string | number | null;
  sourceText?: string | null;
  confidence: Confidence;
  /** Preferred Phase 3 status */
  status?: FactStatus;
  /** @deprecated use status; kept for older records */
  sourceType: FactSourceType;
  /** @deprecated use sourceType / status */
  source?: 'ai' | 'user' | 'unknown';
}

export interface ReminderSettings {
  enabled: boolean;
  daysBefore: number[];
  notifyOnDay: boolean;
}

export interface MemoryRecord {
  id: string;
  title: string;
  category: Category;
  description: string;
  sourceType: SourceType;
  sourceReference?: string;
  amount: number | null;
  currency: string | null;
  eventDate: string | null; // ISO YYYY-MM-DD
  deadline: string | null; // ISO YYYY-MM-DD
  recurrence: string | null; // monthly | yearly | weekly | null
  renewalDay?: number | null; // day of month for monthly
  reminderSettings: ReminderSettings;
  status: RecordStatus;
  extractedFacts: ExtractedFact[];
  confidence: Confidence;
  notes: string;
  evidence?: string[];
  language?: 'en' | 'ru' | 'mixed' | 'unknown';
  isDemo?: boolean;
  /** Internal: which provider produced this (not shown to users) */
  _providerMeta?: ProviderMeta;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionWarning {
  code: string;
  message: string;
  field?: string;
}

export interface ProviderMeta {
  providerId: string;
  model?: string;
  usedFallback?: boolean;
  fallbackFrom?: string;
  latencyMs?: number;
}

export interface ExtractionResult {
  records: Partial<MemoryRecord>[];
  warnings: ExtractionWarning[];
  rawText: string;
  language: 'en' | 'ru' | 'mixed' | 'unknown';
  confidence: Confidence;
  /** Internal metadata — never shown in normal UI */
  meta?: ProviderMeta;
  /** Processing outcome for UI state */
  outcome?: 'success' | 'needs_confirmation' | 'error' | 'fallback';
}

export interface ExtractionInput {
  text?: string;
  sourceType: SourceType;
  fileName?: string;
  mimeType?: string;
  imageDataUrl?: string;
}

export type AppearanceMode = 'system' | 'light' | 'dark';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  photoDataUrl: string | null;
}

export interface AppSettings {
  language: 'en' | 'ru';
  appearance: AppearanceMode;
  profile: UserProfile;
  reminderPreferences: {
    defaultDaysBefore: number[];
  };
  notificationPreferences: {
    enabled: boolean;
  };
}

export type Screen =
  | 'welcome'
  | 'home'
  | 'add'
  | 'processing'
  | 'confirmation'
  | 'detail'
  | 'memories'
  | 'settings';
