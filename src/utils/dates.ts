import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';

function parseISODate(dateStr: string): Date | null {
  // Expect YYYY-MM-DD or full ISO
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function differenceInCalendarDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function getCountdownLabel(dateStr: string | null, lang: Language): string | null {
  if (!dateStr) return null;
  const date = parseISODate(dateStr);
  if (!date) return null;

  const days = differenceInCalendarDays(date, new Date());
  const t = translations[lang];

  if (days < 0) return t.expired;
  if (days === 0) return t.today;
  if (days === 1) return t.tomorrow;
  return t.daysLeft.replace('{n}', String(days));
}

export function isUrgent(dateStr: string | null, thresholdDays = 7): boolean {
  if (!dateStr) return false;
  const date = parseISODate(dateStr);
  if (!date) return false;
  const days = differenceInCalendarDays(date, new Date());
  return days <= thresholdDays;
}

export function formatDisplayDate(dateStr: string | null, lang: Language): string {
  if (!dateStr) return translations[lang].notFound;
  try {
    const d = parseISODate(dateStr);
    if (!d) return translations[lang].notFound;
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return translations[lang].notFound;
  }
}

/** Calendar days from today to date (negative = past). null if invalid. */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = parseISODate(dateStr);
  if (!date) return null;
  return differenceInCalendarDays(date, new Date());
}

export type TimelineBucket = 'today' | 'thisWeek' | 'nextWeek' | 'thisMonth' | 'later' | 'past';

/**
 * Bucket an upcoming deadline relative to "now".
 * Only uses the provided ISO date — never invents values.
 */
export function getTimelineBucket(dateStr: string | null): TimelineBucket | null {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  if (days <= 7) return 'thisWeek';
  if (days <= 14) return 'nextWeek';
  if (days <= 31) return 'thisMonth';
  return 'later';
}

/** True when deadline is within the next `rangeDays` days (inclusive), or any future if rangeDays is null. */
export function isWithinTimeRange(dateStr: string | null, rangeDays: number | null): boolean {
  const days = daysUntil(dateStr);
  if (days === null) return false;
  if (days < 0) return false;
  if (rangeDays === null) return true;
  return days <= rangeDays;
}
