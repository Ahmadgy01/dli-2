/**
 * UI-facing extraction entry point.
 * Delegates to the AI Router (provider-agnostic, automatic fallback).
 * Secrets are NEVER read here — only public VITE_* flags.
 */

import type { ExtractionInput, ExtractionResult } from '../types';
import type { AIProvider } from './providers/types.ts';
import { getAIRouter } from './providers/router.ts';
import { demoProvider } from './providers/demoProvider.ts';
import { serverProvider } from './providers/serverProvider.ts';

/** @deprecated Prefer getAIRouter(); kept for compatibility */
export function getActiveProvider(): AIProvider {
  const env = typeof import.meta !== 'undefined' ? (import.meta as ImportMeta & { env?: Record<string, string> }).env : undefined;
  const mode = env?.VITE_EXTRACTION_MODE?.toLowerCase();
  if (mode === 'real') return serverProvider;
  return demoProvider;
}

export function isRealModeConfigured(): boolean {
  const env = typeof import.meta !== 'undefined' ? (import.meta as ImportMeta & { env?: Record<string, string> }).env : undefined;
  return env?.VITE_EXTRACTION_MODE?.toLowerCase() === 'real';
}

/**
 * Primary entry point used by the UI.
 * Routes through the AI Router with automatic provider fallback.
 */
export async function extractInformation(
  input: ExtractionInput
): Promise<ExtractionResult> {
  const router = getAIRouter();
  const result = await router.extract(input);

  // Tag demo usage clearly (dev transparency, not user-facing branding)
  if (result.meta?.providerId === 'demo' && !result.warnings?.some((w) => w.code === 'DEMO_MODE')) {
    return {
      ...result,
      warnings: [
        ...(result.warnings || []),
        {
          code: 'DEMO_MODE',
          message:
            'Using development demo extraction. Configure the server with EXTRACTION_MODE=real and AI_API_KEY for live AI.',
        },
      ],
    };
  }

  return result;
}

/** @deprecated – use extractInformation */
export async function extractFromInput(input: {
  text?: string;
  sourceType: 'camera' | 'photo' | 'file' | 'manual';
  fileName?: string;
}): Promise<{ records: Partial<import('../types').MemoryRecord>[] }> {
  const result = await extractInformation({
    text: input.text,
    sourceType: input.sourceType,
    fileName: input.fileName,
  });
  return { records: result.records };
}

export { demoProvider, serverProvider };
export type { AIProvider };
