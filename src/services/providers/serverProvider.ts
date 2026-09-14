/**
 * Server-backed AI provider.
 * Calls the secure DON'T LOSE IT gateway.
 * API keys never appear in this file or the frontend bundle.
 */

import type { AIProvider } from './types.ts';
import type { ExtractionInput, ExtractionResult } from '../../types';

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_API_BASE_URL) || '';

interface ApiSuccess {
  status: string;
  extraction_model?: string;
  data: ExtractionResult;
}

interface ApiError {
  error?: string;
  message?: string;
  detail?: string;
  demoFallback?: boolean;
  result?: ExtractionResult;
}

function mapRecords(result: ExtractionResult): ExtractionResult {
  const records = (result.records || []).map((r) => ({
    ...r,
    status: 'active' as const,
    notes: r.notes ?? '',
  }));

  return { ...result, records };
}

function buildMessage(input: ExtractionInput): string {
  if (input.text?.trim()) {
    return input.text.trim();
  }

  return [
    input.fileName ? `File: ${input.fileName}` : '',
    input.sourceType ? `Source type: ${input.sourceType}` : '',
    input.mimeType ? `MIME type: ${input.mimeType}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export const serverProvider: AIProvider = {
  id: 'server',

  name: 'Server AI',

  capabilities: {
    text: true,
    image: true,
    document: true,
    multilingual: true,
  },

  isAvailable(): boolean {
    const env =
      typeof import.meta !== 'undefined'
        ? (import.meta as ImportMeta & {
            env?: Record<string, string>;
          }).env
        : undefined;

    return env?.VITE_EXTRACTION_MODE?.toLowerCase() === 'real';
  },

  async extractInformation(
    input: ExtractionInput
  ): Promise<ExtractionResult> {
    const url = `${API_BASE}/api/extract`;

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: buildMessage(input),
        }),
      });
    } catch {
      const err = new Error(
        'NETWORK_ERROR: Cannot reach the extraction server.'
      ) as Error & { demoFallback?: boolean };

      err.demoFallback = true;
      throw err;
    }

    let data: ApiSuccess | ApiError;

    try {
      data = (await response.json()) as ApiSuccess | ApiError;
    } catch {
      throw new Error(
        'SERVER_ERROR: Invalid response from extraction server.'
      );
    }

    if (!response.ok) {
      const errBody = data as ApiError;

      const error = new Error(
        errBody.message ||
          errBody.detail ||
          'Extraction failed'
      ) as Error & {
        code?: string;
        demoFallback?: boolean;
      };

      error.code = errBody.error;
      error.demoFallback = errBody.demoFallback === true;

      throw error;
    }

    const success = data as ApiSuccess;

    if (!success.data) {
      throw new Error(
        'SERVER_ERROR: Missing extraction data.'
      );
    }

    const mapped = mapRecords(success.data);

    mapped.records = mapped.records.map((r) => ({
      ...r,
      sourceType: input.sourceType,
      sourceReference: input.fileName,
    }));

    mapped.meta = {
      providerId: 'server',
      model: success.extraction_model,
      ...(mapped.meta || {}),
    };

    return mapped;
  },

  async extractFromText(
    text: string,
    input?: Partial<ExtractionInput>
  ) {
    return this.extractInformation({
      text,
      sourceType: input?.sourceType || 'manual',
      fileName: input?.fileName,
      mimeType: input?.mimeType,
    });
  },

  async extractFromImage(
    imageDataUrl: string,
    input?: Partial<ExtractionInput>
  ) {
    return this.extractInformation({
      imageDataUrl,
      text: input?.text,
      sourceType: input?.sourceType || 'photo',
      fileName: input?.fileName,mimeType: input?.mimeType || 'image/jpeg',
    });
  },

  async extractFromDocument(
    input: ExtractionInput
  ) {
    return this.extractInformation(input);
  },
};
