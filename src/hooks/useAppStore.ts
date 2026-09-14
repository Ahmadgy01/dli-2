import { useState, useEffect, useCallback } from 'react';
import type { MemoryRecord, AppSettings, Category } from '../types';
import { loadRecords, saveRecords, loadSettings, saveSettings, isOnboarded, setOnboarded } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';

export function useAppStore() {
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [onboarded, setOnboardedState] = useState(isOnboarded());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const data = loadRecords();
    setRecords(data);
    setReady(true);
  }, []);

  const persist = useCallback((next: MemoryRecord[]) => {
    setRecords(next);
    saveRecords(next);
  }, []);

  const addRecords = useCallback(
    (partials: Partial<MemoryRecord>[]) => {
      const now = new Date().toISOString();
      const newOnes: MemoryRecord[] = partials.map((p) => ({
        id: uuidv4(),
        title: p.title || 'Untitled',
        category: (p.category as Category) || 'Other',
        description: p.description || '',
        sourceType: p.sourceType || 'manual',
        sourceReference: p.sourceReference,
        amount: p.amount ?? null,
        currency: p.currency ?? null,
        eventDate: p.eventDate ?? null,
        deadline: p.deadline ?? null,
        recurrence: p.recurrence ?? null,
        renewalDay: p.renewalDay ?? null,
        reminderSettings: p.reminderSettings || {
          enabled: true,
          daysBefore: settings.reminderPreferences.defaultDaysBefore,
          notifyOnDay: true,
        },
        status: 'active',
        extractedFacts: p.extractedFacts || [],
        confidence: p.confidence || 'medium',
        notes: p.notes || '',
        evidence: p.evidence || [],
        language: p.language || 'unknown',
        isDemo: false,
        createdAt: now,
        updatedAt: now,
      }));
      persist([...newOnes, ...records]);
      return newOnes;
    },
    [records, persist, settings]
  );

  const updateRecord = useCallback(
    (id: string, updates: Partial<MemoryRecord>) => {
      const next = records.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      );
      persist(next);
    },
    [records, persist]
  );

  const deleteRecord = useCallback(
    (id: string) => {
      persist(records.filter((r) => r.id !== id));
    },
    [records, persist]
  );

  const updateSettings = useCallback((next: Partial<AppSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      saveSettings(merged);
      return merged;
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboarded();
    setOnboardedState(true);
  }, []);

  return {
    records,
    settings,
    onboarded,
    ready,
    addRecords,
    updateRecord,
    deleteRecord,
    updateSettings,
    completeOnboarding,
  };
}
