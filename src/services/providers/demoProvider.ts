import type { AIProvider } from './types.ts';
import type {
  ExtractionInput,
  ExtractionResult,
  MemoryRecord,
  Category,
  ExtractedFact,
  Confidence,
  ExtractionWarning,
} from '../../types';

/**
 * Demo / development provider.
 * Uses deterministic pattern matching + heuristics.
 * NEVER invents warranty, return periods, or other facts not present in the text.
 * Replace with RealAIProvider when a backend is available.
 */

function makeFact(
  field: string,
  value: string | number | null,
  sourceText: string | null,
  confidence: Confidence = 'medium'
): ExtractedFact {
  const isNull = value === null || value === undefined;
  return {
    field,
    value: isNull ? null : value,
    sourceText,
    confidence: isNull ? 'unknown' : confidence,
    sourceType: isNull ? 'UNKNOWN' : 'EXTRACTED',
    status: isNull ? 'NOT_FOUND' : 'EXTRACTED',
  };
}

function detectLanguage(text: string): 'en' | 'ru' | 'mixed' | 'unknown' {
  if (!text.trim()) return 'unknown';
  const hasCyrillic = /[а-яА-ЯёЁ]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  if (hasCyrillic && hasLatin) return 'mixed';
  if (hasCyrillic) return 'ru';
  if (hasLatin) return 'en';
  return 'unknown';
}

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  const rules: [Category, string[]][] = [
    ['Subscription', ['subscription', 'membership', 'renew', 'monthly', 'подписка', 'абонемент', 'продлевается', 'ежемесячно']],
    ['Warranty', ['warranty', 'guarantee', 'гарантия', 'гарантийный']],
    ['Return', ['return', 'refund', 'возврат', 'вернуть']],
    ['Contract', ['contract', 'agreement', 'lease', 'rental', 'договор', 'аренда', 'контракт']],
    ['Money', ['payment', 'pay', 'amount', 'rubles', 'руб', 'usd', '$', '€', 'cost', 'price', 'fee', 'оплата', 'сумма', 'платеж', 'tuition', 'tuition']],
    ['Deadline', ['deadline', 'due', 'by', 'until', 'expires', 'expiration', 'срок', 'дедлайн', 'до', 'заканчивается', 'истекает']],
    ['Document', ['document', 'passport', 'insurance', 'полис', 'страховка', 'документ', 'policy']],
  ];
  for (const [cat, kws] of rules) {
    if (kws.some((k) => lower.includes(k))) return cat;
  }
  return 'Other';
}

function extractAmount(text: string): { amount: number | null; currency: string | null; sourceText: string | null } {
  const patterns: {
    re: RegExp;
    amountGroup: number;
    curr: (m: RegExpMatchArray) => string;
  }[] = [
    { re: /(\$|€|£)\s*([\d.,]+)/i, amountGroup: 2, curr: (m) => m[1] },
    { re: /([\d.,]+)\s*(₽|руб(?:лей|ля|ль)?\.?|rubles?|rub)/i, amountGroup: 1, curr: () => '₽' },
    { re: /([\d.,]+)\s*(usd|eur|gbp)/i, amountGroup: 1, curr: (m) => m[2].toUpperCase() },
    { re: /([\d.,]+)\s*(долларов|евро)/i, amountGroup: 1, curr: (m) => (m[2].includes('долл') ? 'USD' : 'EUR') },
  ];
  for (const p of patterns) {
    const m = text.match(p.re);
    if (m) {
      const numStr = (m[p.amountGroup] || '').replace(/,/g, '').replace(/\s/g, '');
      const amount = parseFloat(numStr);
      if (!isNaN(amount)) {
        return { amount, currency: p.curr(m), sourceText: m[0] };
      }
    }
  }
  return { amount: null, currency: null, sourceText: null };
}

/** Very conservative date extraction. Never invents year. */
function extractDates(text: string): {
  eventDate: string | null;
  deadline: string | null;
  sourceTexts: string[];
  warnings: ExtractionWarning[];
} {
  const warnings: ExtractionWarning[] = [];
  const sourceTexts: string[] = [];
  let eventDate: string | null = null;
  let deadline: string | null = null;

  // ISO
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    eventDate = iso[1];
    deadline = iso[1];
    sourceTexts.push(iso[0]);
    return { eventDate, deadline, sourceTexts, warnings };
  }

  // DD.MM.YYYY or DD/MM/YYYY
  const dmy = text.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    const isoDate = `${y}-${m}-${d}`;
    eventDate = isoDate;
    deadline = isoDate;
    sourceTexts.push(dmy[0]);
    return { eventDate, deadline, sourceTexts, warnings };
  }

  // Month name English: September 7, 2026 / Sep 7 2026
  const enMonth = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i
  );
  if (enMonth) {
    const months: Record<string, string> = {
      january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
      april: '04', apr: '04', may: '05', june: '06', jun: '06', july: '07', jul: '07',
      august: '08', aug: '08', september: '09', sep: '09', october: '10', oct: '10',
      november: '11', nov: '11', december: '12', dec: '12',
    };
    const m = months[enMonth[1].toLowerCase().slice(0, 3)] || months[enMonth[1].toLowerCase()];
    if (m) {
      const day = enMonth[2].padStart(2, '0');
      const isoDate = `${enMonth[3]}-${m}-${day}`;
      eventDate = isoDate;
      deadline = isoDate;
      sourceTexts.push(enMonth[0]);
      return { eventDate, deadline, sourceTexts, warnings };
    }
  }

  // Russian: 3 ноября 2026 / 15 сентября
  const ruMonths: Record<string, string> = {
    января: '01', февраля: '02', марта: '03', апреля: '04', мая: '05', июня: '06',
    июля: '07', августа: '08', сентября: '09', октября: '10', ноября: '11', декабря: '12',
  };
  const ruFull = text.match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})/i);
  if (ruFull) {
    const m = ruMonths[ruFull[2].toLowerCase()];
    if (m) {
      const day = ruFull[1].padStart(2, '0');
      const isoDate = `${ruFull[3]}-${m}-${day}`;
      eventDate = isoDate;
      deadline = isoDate;
      sourceTexts.push(ruFull[0]);
      return { eventDate, deadline, sourceTexts, warnings };
    }
  }

  // Relative without year – ambiguous, do not invent year
  const relativeNoYear = text.match(/(?:on the |на |числа\s*)(\d{1,2})(?:st|nd|rd|th)?(?:\s+of\s+(?:each|every)\s+month)?/i);
  if (relativeNoYear && /month|месяц|ежемесячно|каждый месяц/i.test(text)) {
    // leave dates null; recurrence will handle
    warnings.push({
      code: 'AMBIGUOUS_DATE',
      message: 'Renewal day found but no absolute date; next occurrence will be calculated from recurrence.',
      field: 'deadline',
    });
  } else if (relativeNoYear || /завтра|tomorrow|сегодня|today|через\s+\d+\s+дн/i.test(text)) {
    warnings.push({
      code: 'AMBIGUOUS_DATE',
      message: 'Relative or incomplete date found. Please confirm the exact date.',
      field: 'deadline',
    });
  }

  return { eventDate, deadline, sourceTexts, warnings };
}

function extractRecurrence(text: string): { recurrence: string | null; renewalDay: number | null; sourceText: string | null } {
  let recurrence: string | null = null;
  let renewalDay: number | null = null;
  let sourceText: string | null = null;

  if (/every month|monthly|каждый месяц|ежемесячно|раз в месяц/i.test(text)) {
    recurrence = 'monthly';
    const m1 = text.match(/every month|monthly|каждый месяц|ежемесячно|раз в месяц/i);
    sourceText = m1 ? m1[0] : null;
  } else if (/every year|yearly|ежегодно|каждый год/i.test(text)) {
    recurrence = 'yearly';
    const m2 = text.match(/every year|yearly|ежегодно|каждый год/i);
    sourceText = m2 ? m2[0] : null;
  } else if (/every week|weekly|еженедельно/i.test(text)) {
    recurrence = 'weekly';
    const m3 = text.match(/every week|weekly|еженедельно/i);
    sourceText = m3 ? m3[0] : null;
  }

  const dayMatch = text.match(/(?:on the |на |числа\s*)(\d{1,2})(?:st|nd|rd|th)?/i);
  if (dayMatch && recurrence === 'monthly') {
    renewalDay = parseInt(dayMatch[1], 10);
    if (renewalDay < 1 || renewalDay > 31) renewalDay = null;
  }

  return { recurrence, renewalDay, sourceText };
}

function nextMonthlyOccurrence(day: number): string {
  const now = new Date();
  let candidate = new Date(now.getFullYear(), now.getMonth(), day);
  if (candidate <= now) {
    candidate = new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  // handle months with fewer days
  if (candidate.getDate() !== day) {
    candidate = new Date(now.getFullYear(), now.getMonth() + 2, 0); // last day of next month-ish
  }
  return candidate.toISOString().slice(0, 10);
}

function extractTitle(text: string, category: Category): string {
  const first = text.trim().split(/[.!?\n]/)[0].trim();
  if (first.length > 3 && first.length <= 70) return first;
  if (first.length > 70) return first.slice(0, 67) + '…';
  return category === 'Other' ? 'Untitled memory' : `${category} item`;
}

/** Main demo extraction – strictly conservative */
export const demoProvider: AIProvider = {
  id: 'demo',
  name: 'Demo',
  capabilities: {
    text: true,
    image: false, // placeholder only — no real OCR
    document: false,
    multilingual: true,
  },

  isAvailable(): boolean {
    return true;
  },

  async extractInformation(input: ExtractionInput): Promise<ExtractionResult> {
    // Realistic short delay
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));

    const text = (input.text || '').trim();
    const language = detectLanguage(text);
    const warnings: ExtractionWarning[] = [];

    if (!text) {
      if (input.sourceType === 'camera' || input.sourceType === 'photo' || input.sourceType === 'file') {
        return {
          records: [
            {
              title: input.fileName || 'Uploaded item',
              category: 'Document',
              description: 'File received. Full OCR + AI extraction will be available when the real AI backend is connected.',
              sourceType: input.sourceType,
              sourceReference: input.fileName,
              amount: null,
              currency: null,
              eventDate: null,
              deadline: null,
              recurrence: null,
              extractedFacts: [
                makeFact('title', input.fileName || null, null, 'low'),
                makeFact('note', 'OCR not available in demo provider', null, 'low'),
              ],
              confidence: 'low',
              notes: '',
              language,
            },
          ],
          warnings: [
            {
              code: 'NO_OCR',
              message: 'Image/PDF text extraction is not available in the demo provider. Provide text manually or connect a real AI backend.',
            },
          ],
          rawText: '',
          language,
          confidence: 'low',
        };
      }
      return {
        records: [],
        warnings: [{ code: 'EMPTY', message: 'No information provided.' }],
        rawText: '',
        language: 'unknown',
        confidence: 'unknown',
      };
    }

    const category = detectCategory(text);
    const { amount, currency, sourceText: amountSrc } = extractAmount(text);
    const { eventDate, deadline, sourceTexts: dateSrcs, warnings: dateWarnings } = extractDates(text);
    warnings.push(...dateWarnings);
    const { recurrence, renewalDay, sourceText: recSrc } = extractRecurrence(text);
    const title = extractTitle(text, category);

    // Calculate next occurrence only when recurrence + day are explicit
    let finalDeadline = deadline;
    if (recurrence === 'monthly' && renewalDay && !deadline) {
      finalDeadline = nextMonthlyOccurrence(renewalDay);
    }

    const facts: ExtractedFact[] = [
      makeFact('title', title, title, 'high'),
      makeFact('category', category, null, 'medium'),
      makeFact('amount', amount, amountSrc, amount !== null ? 'high' : 'unknown'),
      makeFact('currency', currency, amountSrc, currency !== null ? 'high' : 'unknown'),
      makeFact('eventDate', eventDate, dateSrcs[0] || null, eventDate ? 'medium' : 'unknown'),
      makeFact('deadline', finalDeadline, dateSrcs[0] || null, finalDeadline ? 'medium' : 'unknown'),
      makeFact('recurrence', recurrence, recSrc, recurrence ? 'high' : 'unknown'),
      makeFact('renewalDay', renewalDay, recSrc, renewalDay ? 'high' : 'unknown'),
    ];

    // Explicitly do NOT invent warranty / return
    facts.push(makeFact('warranty', null, null, 'unknown'));
    facts.push(makeFact('returnDeadline', null, null, 'unknown'));

    if (!amount && !finalDeadline && !recurrence) {
      warnings.push({
        code: 'LOW_SIGNAL',
        message: 'I could not confidently find dates, payments or other structured facts. Please review and add details manually if needed.',
      });
    }

    if (dateWarnings.some((w) => w.code === 'AMBIGUOUS_DATE')) {
      warnings.push({
        code: 'CONFIRM_DATE',
        message: 'Please verify the date before saving.',
      });
    }

    const overallConfidence: Confidence =
      amount !== null || finalDeadline !== null || recurrence !== null ? 'medium' : 'low';

    const record: Partial<MemoryRecord> = {
      title,
      category,
      description: text,
      sourceType: input.sourceType,
      sourceReference: input.fileName,
      amount,
      currency,
      eventDate,
      deadline: finalDeadline,
      recurrence,
      renewalDay: renewalDay ?? null,
      extractedFacts: facts,
      confidence: overallConfidence,
      notes: '',
      evidence: [...dateSrcs, amountSrc, recSrc].filter(Boolean) as string[],
      language,
    };

    return {
      records: [record],
      warnings,
      rawText: text,
      language,
      confidence: overallConfidence,
    };
  },
};
