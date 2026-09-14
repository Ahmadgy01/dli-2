/**
 * DON'T LOSE IT AI Router
 *
 * REAL mode:
 *   Browser -> secure server provider -> DON'T LOSE IT Gateway -> Kimi
 *
 * DEMO mode:
 *   Browser -> local demo provider
 *
 * IMPORTANT:
 * In REAL mode we NEVER silently fall back to demo.
 * A real backend failure must be visible instead of being
 * disguised as successful demo extraction.
 */

import type {
  ExtractionInput,
  ExtractionResult,
  ProviderMeta,
} from '../../types';

import type {
  AIProvider,
  ProviderId,
  RouterConfig,
} from './types.ts';

import { demoProvider } from './demoProvider.ts';
import { serverProvider } from './serverProvider.ts';

function getEnv() {
  return typeof import.meta !== 'undefined'
    ? (import.meta as ImportMeta & {
        env?: Record<string, string>;
      }).env
    : undefined;
}

function buildRegistry(): Map<string, AIProvider> {
  const map = new Map<string, AIProvider>();

  map.set('server', serverProvider);
  map.set('real', serverProvider);
  map.set('demo', demoProvider);

  return map;
}

function isRealMode(): boolean {
  return getEnv()?.VITE_EXTRACTION_MODE?.toLowerCase() === 'real';
}

function resolveOrder(): ProviderId[] {
  if (isRealMode()) {
    return ['server'];
  }

  return ['demo'];
}

function determineOutcome(
  result: ExtractionResult,
  usedFallback: boolean
): ExtractionResult['outcome'] {
  if (usedFallback) {
    return 'fallback';
  }

  if (
    result.warnings?.some(
      (w) =>
        w.code === 'PROVIDER_ERROR' ||
        w.code === 'AI_FAILED'
    )
  ) {
    return 'error';
  }

  if (
    result.warnings?.some(
      (w) =>
        w.code === 'AMBIGUOUS_DATE' ||
        w.code === 'CONFIRM_DATE' ||
        w.code === 'NEEDS_CONFIRMATION' ||
        w.code === 'LOW_SIGNAL'
    )
  ) {
    return 'needs_confirmation';
  }

  if (!result.records?.length) {
    return 'needs_confirmation';
  }

  return 'success';
}

export class AIRouter {
  private registry: Map<string, AIProvider>;
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.registry = buildRegistry();

    const real = isRealMode();

    this.config = {
      preferredOrder:
        config?.preferredOrder ?? resolveOrder(),

      // CRITICAL:
      // Never hide a real server failure behind demo mode.
      allowDemoFallback:
        config?.allowDemoFallback ?? !real,
    };
  }

  getProviders(): AIProvider[] {
    return Array.from(this.registry.values());
  }

  async extract(
    input: ExtractionInput
  ): Promise<ExtractionResult> {
    const order = [...this.config.preferredOrder];

    if (
      this.config.allowDemoFallback &&
      !order.includes('demo')
    ) {
      order.push('demo');
    }

    const tried: string[] = [];
    let lastError: Error | null = null;
    const start = Date.now();

    for (const id of order) {
      const provider = this.registry.get(id);

      if (!provider) {
        continue;
      }

      if (tried.includes(provider.id)) {
        continue;
      }

      const available = await Promise.resolve(
        provider.isAvailable()
      );

      if (!available) {
        tried.push(provider.id);
        continue;
      }

      const needsImage =
        Boolean(input.imageDataUrl) &&
        !input.text?.trim();

      const needsDoc =
        input.sourceType === 'file' &&
        Boolean(
          input.mimeType?.includes('pdf') ||
          input.fileName
            ?.toLowerCase()
            .endsWith('.pdf')
        );

      if (
        needsImage &&
        !provider.capabilities.image
      ) {
        tried.push(provider.id);
        continue;
      }

      if (
        needsDoc &&
        !provider.capabilities.document &&
        !provider.capabilities.image
      ) {
        tried.push(provider.id);
        continue;
      }

      try {
        const result =
          await provider.extractInformation(input);

        const latencyMs = Date.now() - start;
        const usedFallback = tried.length > 0;

        const meta: ProviderMeta = {
          providerId: provider.id,
          usedFallback,
          fallbackFrom: usedFallback
            ? tried[0]
            : undefined,
          latencyMs,
          ...(result.meta || {}),
        };

        return {
          ...result,
          meta,
          outcome: determineOutcome(
            result,
            usedFallback
          ),
        };
      } catch (err) {
        lastError =
          err instanceof Error
            ? err
            : new Error(String(err));

        tried.push(provider.id);

        // In REAL mode this is the final attempt.
        // Do NOT silently switch to demo.
      }
    }

    const message =
      lastError?.message ||
      'AI extraction server is unavailable.';

    return {
      records: [],

      warnings: [
        {
          code: 'PROVIDER_ERROR',
          message: `Live AI extraction failed: ${message}`,
        },
      ],

      rawText: input.text || '',
      language: 'unknown',
      confidence: 'unknown',
      outcome: 'error',

      meta: {
        providerId: 'none',
        usedFallback: false,
        latencyMs: Date.now() - start,
      },
    };
  }
}

let defaultRouter: AIRouter | null = null;

export function getAIRouter(): AIRouter {
  if (!defaultRouter) {
    defaultRouter = new AIRouter();
  }

  return defaultRouter;
}

export function resetAIRouter(): void {
  defaultRouter = null;
}
