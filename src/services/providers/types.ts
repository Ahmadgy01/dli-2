import type { ExtractionInput, ExtractionResult } from '../../types';

/** Capability flags for routing decisions */
export interface ProviderCapabilities {
  text: boolean;
  image: boolean;
  document: boolean;
  multilingual: boolean;
}

/**
 * Provider-agnostic AI interface.
 * Implementations must never invent facts.
 * Secrets never live in provider code that runs on the client.
 */
export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  /** Whether this provider can be used right now (config + runtime) */
  isAvailable(): boolean | Promise<boolean>;

  /** Unified extraction entry (preferred) */
  extractInformation(input: ExtractionInput): Promise<ExtractionResult>;

  /** Optional specialized methods — fall back to extractInformation if absent */
  extractFromText?(text: string, input?: Partial<ExtractionInput>): Promise<ExtractionResult>;
  extractFromImage?(imageDataUrl: string, input?: Partial<ExtractionInput>): Promise<ExtractionResult>;
  extractFromDocument?(input: ExtractionInput): Promise<ExtractionResult>;
}

export type ProviderId = 'demo' | 'yandex' | 'openai' | 'anthropic' | 'groq' | string;

export interface RouterConfig {
  /** Ordered preference list, e.g. ['openai', 'anthropic', 'demo'] */
  preferredOrder: ProviderId[];
  /** Always allow demo as last resort in development */
  allowDemoFallback: boolean;
}
