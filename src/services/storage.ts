import type { MemoryRecord, AppSettings } from '../types';

const RECORDS_KEY = 'dli_records';
const SETTINGS_KEY = 'dli_settings';
const ONBOARDED_KEY = 'dli_onboarded';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  appearance: 'dark',
  profile: { firstName: '', lastName: '', email: '', photoDataUrl: null },
  reminderPreferences: { defaultDaysBefore: [7, 3, 1] },
  notificationPreferences: { enabled: true },
};

function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const p = raw?.profile;
  return {
    language: raw?.language === 'ru' ? 'ru' : 'en',
    appearance:
      raw?.appearance === 'light' || raw?.appearance === 'system' || raw?.appearance === 'dark'
        ? raw.appearance
        : 'dark',
    profile: {
      firstName: p?.firstName || '',
      lastName: p?.lastName || '',
      email: p?.email || '',
      photoDataUrl: p?.photoDataUrl || null,
    },
    reminderPreferences: raw?.reminderPreferences || { defaultDaysBefore: [7, 3, 1] },
    notificationPreferences: raw?.notificationPreferences || { enabled: true },
  };
}

export function loadRecords(): MemoryRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MemoryRecord[];
  } catch {
    return [];
  }
}

export function saveRecords(records: MemoryRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === 'true';
}

export function setOnboarded(): void {
  localStorage.setItem(ONBOARDED_KEY, 'true');
}
