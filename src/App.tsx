import { useState, useMemo, useEffect, useLayoutEffect, useRef, type CSSProperties, type ChangeEvent } from 'react';
import { useAppStore } from './hooks/useAppStore';
import { translations, type Language, type TranslationKey } from './i18n/translations';
import type { MemoryRecord, Category, ExtractionWarning, AppearanceMode } from './types';
import { extractInformation } from './services/aiExtraction';
import {
  getCountdownLabel,
  isUrgent,
  formatDisplayDate,
  daysUntil,
  getTimelineBucket,
  isWithinTimeRange,
  type TimelineBucket,
} from './utils/dates';
import { CosmicBackground } from './components/CosmicBackground';
import { MemoryOrbHero } from './components/MemoryOrbHero';
import type { OrbState } from './components/MemoryOrbHero';
import { CategoryIcon } from './components/CategoryIcon';

/* ─── Icons ─────────────────────────────────────────────────── */
const IconHome = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>);
const IconList = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>);
const IconTimeline = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><path d="M12 7v3M12 14v3"/></svg>);
const IconSettings = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>);
const IconPlus = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" width="22" height="22"><path d="M12 5v14M5 12h14"/></svg>);
const IconCamera = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>);
const IconImage = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>);
const IconFile = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>);
const IconBack = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>);
const IconSearch = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>);
const IconMic = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>);
const IconBell = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>);
const IconUser = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IconShield = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
const IconHelp = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>);
const IconInfo = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>);
const IconSun = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>);

type Tab = 'home' | 'memories' | 'timeline' | 'settings';
type Flow = 'none' | 'add' | 'manual' | 'processing' | 'confirm' | 'detail' | 'saved' | 'profile-edit' | 'appearance';
type OnboardStep = 0 | 1 | 2 | 3 | 4;

function greetingKey(): TranslationKey {
  const h = new Date().getHours();
  if (h < 12) return 'goodMorning';
  if (h < 18) return 'goodAfternoon';
  return 'goodEvening';
}

function resolveTheme(appearance: AppearanceMode): 'light' | 'dark' {
  if (appearance === 'light') return 'light';
  if (appearance === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}


/* ─── Memory Orb — visual soul of the product ───────────────── */
function MemoryOrb({
  size = 'hero',
  state = 'normal',
}: {
  size?: 'hero' | 'compact' | 'welcome' | 'home';
  state?: 'normal' | 'urgent' | 'calm' | 'analyzing' | 'success';
}) {
  const sizeClass =
    size === 'compact' ? 'compact' :
    size === 'welcome' ? 'hero' :
    size === 'home' ? 'home' : '';
  return (
    <div className={`memory-orb ${sizeClass} ${state !== 'normal' ? state : ''}`} aria-hidden>
      <div className="orb-halo" />
      <div className="orb-ring r3" />
      <div className="orb-ring r2" />
      <div className="orb-ring" />
      <div className="orb-core" />
      <div className="particle" />
      <div className="particle p2" />
      <div className="particle p3" />
      <div className="particle p4" />
    </div>
  );
}


function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

function App() {
  const store = useAppStore();
  const reducedMotion = useReducedMotion();
  const { records, settings, onboarded, ready, addRecords, updateRecord, deleteRecord, updateSettings, completeOnboarding } = store;
  const lang = settings.language;
  const profile = settings.profile || { firstName: '', lastName: '', email: '', photoDataUrl: null };

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    let s: string = (translations[lang] as Record<string, string>)[key] || key;
    if (params) Object.entries(params).forEach(([k, v]) => { s = s.replace(`{${k}}`, String(v)); });
    return s;
  };

  const [tab, setTab] = useState<Tab>('home');
  const [flow, setFlow] = useState<Flow>('none');
  const [onboardStep, setOnboardStep] = useState<OnboardStep>(0);
  const [manualText, setManualText] = useState('');
  const [extracted, setExtracted] = useState<Partial<MemoryRecord>[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [tlFilter, setTlFilter] = useState('All');
  const [tlRange, setTlRange] = useState<'today' | '7' | '30' | 'all'>('all');
  const [warnings, setWarnings] = useState<ExtractionWarning[]>([]);
  const [processingStep, setProcessingStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = useState('');
  const [search, setSearch] = useState('');
  const [draftName, setDraftName] = useState(profile.firstName);
  const [draftLast, setDraftLast] = useState(profile.lastName);
  const [draftEmail, setDraftEmail] = useState(profile.email);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(profile.photoDataUrl);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [navPill, setNavPill] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const measure = () => {
      const el = navItemRefs.current[tab];
      const nav = navRef.current;
      if (!el || !nav) return;
      const navBox = nav.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      setNavPill({
        left: box.left - navBox.left,
        width: box.width,
        ready: true,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tab, lang, onboarded, flow]);


  // Theme
  const theme = resolveTheme(settings.appearance || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const catLabel = (c: Category) => t(`cat_${c}` as TranslationKey);
  const displayName = profile.firstName || '';

  const needsAttention = useMemo(() =>
    records.filter((r) => r.status === 'active' && isUrgent(r.deadline, 7))
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')),
  [records]);

  const comingSoon = useMemo(() =>
    records.filter((r) => r.status === 'active' && r.deadline && !isUrgent(r.deadline, 7))
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')).slice(0, 6),
  [records]);

  /** Phase 6 — Future timeline: only real deadlines from existing memory data */
  const timelineItems = useMemo(() => {
    const catMap: Record<string, Category[]> = {
      Money: ['Money'],
      Deadlines: ['Deadline'],
      Documents: ['Document'],
      Subscriptions: ['Subscription'],
      Other: ['Other', 'Contract', 'Warranty', 'Return'],
    };
    const rangeDays =
      tlRange === 'today' ? 0 : tlRange === '7' ? 7 : tlRange === '30' ? 30 : null;

    return records
      .filter((r) => r.status === 'active' && r.deadline)
      .filter((r) => isWithinTimeRange(r.deadline, rangeDays))
      .filter((r) => {
        if (tlFilter === 'All') return true;
        const cats = catMap[tlFilter] || [];
        return cats.includes(r.category);
      })
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  }, [records, tlFilter, tlRange]);

  const timelineBuckets = useMemo(() => {
    const order: TimelineBucket[] = ['today', 'thisWeek', 'nextWeek', 'thisMonth', 'later'];
    const groups: Record<string, MemoryRecord[]> = {
      today: [],
      thisWeek: [],
      nextWeek: [],
      thisMonth: [],
      later: [],
    };
    for (const r of timelineItems) {
      const b = getTimelineBucket(r.deadline);
      if (b && b !== 'past' && groups[b]) groups[b].push(r);
    }
    return order
      .filter((k) => groups[k].length > 0)
      .map((k) => ({ key: k, items: groups[k] }));
  }, [timelineItems]);

  const nextImportant = timelineItems[0] || null;
  const attentionThisWeek = useMemo(
    () => timelineItems.filter((r) => isUrgent(r.deadline, 7)).length,
    [timelineItems]
  );

  const filteredMemories = useMemo(() => {
    let list = records.filter((r) => r.status !== 'archived');
    if (filter !== 'All') {
      const map: Record<string, Category[]> = {
        Deadlines: ['Deadline'], Money: ['Money'], Subscriptions: ['Subscription'],
        Contracts: ['Contract'], Warranty: ['Warranty'], Returns: ['Return'],
        Documents: ['Document'], Other: ['Other'],
      };
      list = list.filter((r) => (map[filter] || []).includes(r.category));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const hay = [
          r.title,
          r.description,
          r.notes,
          r.category,
          r.currency || '',
          r.amount != null ? String(r.amount) : '',
          r.sourceReference || '',
          ...(r.extractedFacts || []).map((f) => `${f.field} ${f.value ?? ''}`),
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [records, filter, search]);

  /** Smart sections for Memories library (Phase 5) — only when no search/filter */
  const memorySections = useMemo(() => {
    const isFiltered = filter !== 'All' || search.trim().length > 0;
    if (isFiltered) {
      return {
        mode: 'flat' as const,
        items: filteredMemories,
        attention: [] as MemoryRecord[],
        upcoming: [] as MemoryRecord[],
        recent: [] as MemoryRecord[],
        rest: [] as MemoryRecord[],
        total: filteredMemories.length,
      };
    }
    const attention = filteredMemories
      .filter((r) => r.status === 'active' && r.deadline && isUrgent(r.deadline, 7))
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
    const attentionIds = new Set(attention.map((r) => r.id));
    const upcoming = filteredMemories
      .filter((r) => r.status === 'active' && r.deadline && !attentionIds.has(r.id))
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
    const upcomingIds = new Set(upcoming.map((r) => r.id));
    const recent = [...filteredMemories]
      .filter((r) => !attentionIds.has(r.id) && !upcomingIds.has(r.id))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 8);
    const recentIds = new Set(recent.map((r) => r.id));
    const rest = filteredMemories
      .filter((r) => !attentionIds.has(r.id) && !upcomingIds.has(r.id) && !recentIds.has(r.id))
      .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    return {
      mode: 'sections' as const,
      items: filteredMemories,
      attention,
      upcoming,
      recent,
      rest,
      total: filteredMemories.length,
    };
  }, [filteredMemories, filter, search]);

  const openAdd = () => setFlow('add');
  const closeFlow = () => {
    setFlow('none'); setManualText(''); setExtracted([]); setSelectedIds(new Set());
    setWarnings([]); setPreviewUrl(null); setSourcePreview(''); setProcessingStep(0);
  };

  const processInput = async (text: string, sourceType: 'manual' | 'camera' | 'photo' | 'file', fileName?: string, imageDataUrl?: string) => {
    setFlow('processing'); setProcessingStep(0); setWarnings([]);
    setPreviewUrl(imageDataUrl || null); setSourcePreview(text || fileName || '');

    // Run real extraction in parallel with the approved staged animation.
    // Stages advance on a timer; we wait for both animation floor and AI result.
    const extractionPromise = extractInformation({ text, sourceType, fileName, imageDataUrl });

    const stagePromise = (async () => {
      for (let s = 0; s <= 5; s++) {
        setProcessingStep(s);
        await new Promise((r) => setTimeout(r, s === 0 ? 350 : 400));
      }
    })();

    try {
      const [result] = await Promise.all([extractionPromise, stagePromise]);
      setExtracted(result.records);
      setSelectedIds(new Set(result.records.map((_, i) => i)));
      setWarnings(result.warnings || []);
      setFlow('confirm');
    } catch {
      await stagePromise; // keep animation complete even on hard failure
      setExtracted([]);
      setWarnings([{ code: 'ERROR', message: 'Extraction failed. Please try again.' }]);
      setFlow('confirm');
    }
  };

  const handleSave = () => {
    const toSave = extracted.filter((_, i) => selectedIds.has(i));
    if (toSave.length) addRecords(toSave);
    setFlow('saved');
    setTimeout(() => { closeFlow(); setTab('home'); }, 1600);
  };

  const openDetail = (id: string) => { setDetailId(id); setFlow('detail'); };
  const currentDetail = detailId ? records.find((r) => r.id === detailId) : null;

  const onPhotoPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      setDraftPhoto(url);
      updateSettings({ profile: { ...profile, photoDataUrl: url } });
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    updateSettings({
      profile: {
        firstName: draftName.trim(),
        lastName: draftLast.trim(),
        email: draftEmail.trim(),
        photoDataUrl: draftPhoto,
      },
    });
    setFlow('none');
  };

  const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'lg' | 'xl' }) => {
    const cls = size === 'xl' ? 'avatar xl' : size === 'lg' ? 'avatar lg' : 'avatar';
    if (profile.photoDataUrl) {
      return <div className={cls}><img src={profile.photoDataUrl} alt="" /></div>;
    }
    const initial = (profile.firstName || '?')[0].toUpperCase();
    return <div className={cls}>{initial}</div>;
  };

  /* ─── Loading ─────────────────────────────────────────────── */
  if (!ready) {
    return (
      <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center' }} data-theme={theme}>
        <MemoryOrb size="hero" state="calm" />
      </div>
    );
  }

  /* ─── Onboarding ──────────────────────────────────────────── */
  if (!onboarded) {
    const total = 5;
    // Welcome screen is always dark cinematic — no light mode on this experience
    const shellTheme = onboardStep === 0 ? 'dark' : theme;
    return (
      <div className="app-shell" data-theme={shellTheme}>
        <div className="screen screen-full" style={{ justifyContent: onboardStep === 0 ? 'stretch' : 'center', paddingTop: onboardStep === 0 ? 0 : 40, paddingLeft: onboardStep === 0 ? 0 : undefined, paddingRight: onboardStep === 0 ? 0 : undefined }}>
          {onboardStep > 0 && (
            <div className="onboard-dots">
              {Array.from({ length: total }).map((_, i) => (
                <span key={i} className={i === onboardStep ? 'active' : ''} />
              ))}
            </div>
          )}

          {onboardStep === 0 && (
            <div className="welcome-screen">
              <CosmicBackground reducedMotion={reducedMotion} />
              <div className="welcome-inner">
                <header className="welcome-brand">
                  <h1 className="welcome-title">{t('appName')}</h1>
                  <p className="welcome-tagline">{t('tagline')}</p>
                </header>

                <div className="welcome-orb-zone" aria-hidden>
                  <MemoryOrbHero reducedMotion={reducedMotion} state="idle" intensity="cinematic" />
                </div>

                <div className="welcome-copy">
                  <h2 className="welcome-headline">{t('yourAiAssistant')}</h2>
                  <p className="welcome-body">{t('welcomeBody')}</p>
                </div>

                <div className="welcome-langs" role="group" aria-label={t('language')}>
                  <button
                    type="button"
                    className={`welcome-lang ${lang === 'en' ? 'active' : ''}`}
                    onClick={() => updateSettings({ language: 'en' })}
                    aria-pressed={lang === 'en'}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    className={`welcome-lang ${lang === 'ru' ? 'active' : ''}`}
                    onClick={() => updateSettings({ language: 'ru' })}
                    aria-pressed={lang === 'ru'}
                  >
                    Русский
                  </button>
                </div>

                <button type="button" className="welcome-cta" onClick={() => setOnboardStep(1)}>
                  {t('continue')} →
                </button>
              </div>
            </div>
          )}

          {onboardStep === 1 && (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><MemoryOrb size="compact" state="calm" /></div>
              <div className="h1" style={{ marginBottom: 12 }}>{t('meetYourMemory')}</div>
              <p className="body-sm" style={{ maxWidth: 280, margin: '0 auto 36px' }}>{t('meetSubtitle')}</p>
              <button className="btn btn-primary" onClick={() => setOnboardStep(2)}>{t('continue')} →</button>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setOnboardStep(0)}>{t('back')}</button>
            </div>
          )}

          {onboardStep === 2 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="h1" style={{ textAlign: 'center', marginBottom: 8 }}>{t('whatShouldICallYou')}</div>
              <p className="caption" style={{ textAlign: 'center', marginBottom: 24 }}>{t('addPhoto')}</p>
              <label className="photo-upload">
                {draftPhoto ? <img src={draftPhoto} alt="" /> : <span style={{ fontSize: 28, color: 'var(--text-tertiary)' }}>+</span>}
                <input type="file" accept="image/*" hidden onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setDraftPhoto(String(r.result || ''));
                  r.readAsDataURL(f);
                }} />
              </label>
              <div className="field">
                <label>{t('firstName')}</label>
                <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Ahmad" autoFocus />
              </div>
              <div className="field">
                <label>{t('lastName')}</label>
                <input value={draftLast} onChange={(e) => setDraftLast(e.target.value)} placeholder="Optional" />
              </div>
              <button
                className="btn btn-primary"
                disabled={!draftName.trim()}
                onClick={() => {
                  updateSettings({
                    profile: {
                      firstName: draftName.trim(),
                      lastName: draftLast.trim(),
                      email: '',
                      photoDataUrl: draftPhoto,
                    },
                  });
                  setOnboardStep(3);
                }}
              >
                {t('continue')} →
              </button>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setOnboardStep(1)}>{t('back')}</button>
            </div>
          )}

          {onboardStep === 3 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="h1" style={{ textAlign: 'center', marginBottom: 28 }}>{t('language')}</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
                <button className={`btn ${lang === 'en' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => updateSettings({ language: 'en' })}>English</button>
                <button className={`btn ${lang === 'ru' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => updateSettings({ language: 'ru' })}>Русский</button>
              </div>
              <button className="btn btn-primary" onClick={() => setOnboardStep(4)}>{t('continue')} →</button>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setOnboardStep(2)}>{t('back')}</button>
            </div>
          )}

          {onboardStep === 4 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="h1" style={{ textAlign: 'center', marginBottom: 8 }}>{t('chooseAppearance')}</div>
              <p className="caption" style={{ textAlign: 'center', marginBottom: 24 }}>{t('lightDarkMode')}</p>
              <div className="appearance-grid" style={{ marginBottom: 32 }}>
                {(['system', 'light', 'dark'] as AppearanceMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`appearance-opt ${(settings.appearance || 'dark') === mode ? 'active' : ''}`}
                    onClick={() => updateSettings({ appearance: mode })}
                  >
                    <div className={`preview ${mode}`} />
                    <span>
                      {mode === 'system' ? t('appearanceSystem') : mode === 'light' ? t('appearanceLight') : t('appearanceDark')}
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  updateSettings({
                    profile: {
                      firstName: draftName.trim() || profile.firstName,
                      lastName: draftLast.trim() || profile.lastName,
                      email: draftEmail.trim() || profile.email,
                      photoDataUrl: draftPhoto ?? profile.photoDataUrl,
                    },
                  });
                  completeOnboarding();
                }}
              >
                {t('letsRemember')}
              </button>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setOnboardStep(3)}>{t('back')}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Saved ───────────────────────────────────────────────── */
  if (flow === 'saved') {
    const last = records[0];
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="screen screen-full phase4-center">
          <div className="phase4-orb">
            <MemoryOrbHero reducedMotion={reducedMotion} state="success" />
          </div>
          <div className="h2" style={{ marginBottom: 8 }}>{t('saveSuccess')}</div>
          <p className="body-sm" style={{ marginBottom: 20 }}>{t('savedSubtitle')}</p>
          {last && (
            <button type="button" className="saved-memory-chip" onClick={() => openDetail(last.id)}>
              <CategoryIcon category={last.category} size={18} />
              <div className="smc-text">
                <div className="smc-title">{last.title}</div>
                <div className="smc-meta">
                  {last.amount != null ? `${last.currency || ''}${last.amount}` : catLabel(last.category)}
                  {last.eventDate ? ` · ${formatDisplayDate(last.eventDate, lang)}` : ''}
                </div>
              </div>
            </button>
          )}
          <button type="button" className="btn btn-primary" style={{ marginTop: 24, maxWidth: 280 }} onClick={() => { setFlow('none'); setTab('home'); }}>
            {t('done')}
          </button>
          {last && (
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => openDetail(last.id)}>
              {t('viewMemory')}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (flow === 'processing') {
    const stageMessages: TranslationKey[] = [
      'readingInfo',
      'findingDetails',
      'lookingDates',
      'organizingMatters',
    ];
    const stageIdx = Math.min(Math.floor(processingStep / 2), stageMessages.length - 1);
    const steps: { key: TranslationKey; doneAt: number }[] = [
      { key: 'productIdentified', doneAt: 1 },
      { key: 'purchaseDateFound', doneAt: 2 },
      { key: 'amountFound', doneAt: 3 },
      { key: 'checkingDeadlines', doneAt: 4 },
      { key: 'checkingRenewal', doneAt: 5 },
      { key: 'lookingWorthRemembering', doneAt: 6 },
    ];
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="screen screen-full phase4-center">
          <div className="phase4-orb">
            <MemoryOrbHero reducedMotion={reducedMotion} state="processing" />
          </div>
          <div className="h2" style={{ marginBottom: 6 }}>{t(stageMessages[stageIdx])}</div>
          <p className="caption" style={{ marginBottom: 16 }}>{t('analyzing')}</p>
          {(sourcePreview || previewUrl) && (
            <div className="source-preview phase4-source">
              {previewUrl && <img src={previewUrl} alt="" className="phase4-thumb" />}
              {sourcePreview && <div className="phase4-source-text">{sourcePreview}</div>}
            </div>
          )}
          <div className="proc-steps">
            {steps.map((s, i) => {
              const done = processingStep > s.doneAt;
              const active = processingStep === s.doneAt;
              return (
                <div key={i} className={`proc-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                  <div className="check">{done ? '✓' : ''}</div>
                  <span>{t(s.key)}</span>
                </div>
              );
            })}
          </div>
          <p className="caption" style={{ marginTop: 20, maxWidth: 280 }}>{t('wontGuess')}</p>
        </div>
      </div>
    );
  }

  if (flow === 'confirm') {
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="screen screen-full" style={{ paddingTop: 12, paddingBottom: 24 }}>
          <button type="button" className="capture-close" onClick={closeFlow} style={{ marginBottom: 12 }} aria-label="Close">×</button>
          <div className="phase4-confirm-hero">
            <div className="phase4-orb-sm">
              <MemoryOrbHero reducedMotion={reducedMotion} state="idle" />
            </div>
            <div className="h2">{t('iFoundThis')}</div>
            <p className="body-sm">{t('foundWorthRemembering')}</p>
          </div>

          {warnings.length > 0 && (
            <div className="phase4-warn">
              {warnings.map((w, i) => <div key={i}>{w.message}</div>)}
            </div>
          )}

          {extracted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">{t('memoryEmpty')}</div>
              <div className="empty-sub">{t('wontGuess')}</div>
              <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setFlow('add')}>{t('addSomething')}</button>
            </div>
          ) : (
            <div className="phase4-results">
              {extracted.map((rec, idx) => {
                const selected = selectedIds.has(idx);
                const getFact = (key: string) => (rec.extractedFacts || []).find((f) => f.field === key);
                const statusBadge = (st?: string) => {
                  if (st === 'EXTRACTED') return <span className="status-pill extracted">{t('found')}</span>;
                  if (st === 'USER_ENTERED') return <span className="status-pill user">{t('edited')}</span>;
                  return <span className="status-pill unknown">{t('notFound')}</span>;
                };
                const cat = (rec.category || 'Other') as Category;
                const title = rec.title || 'Untitled';
                return (
                  <div key={idx} className={`phase4-result-card ${selected ? 'selected' : ''}`}>
                    <label className="check-card" style={{ marginBottom: 12 }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            const n = new Set(prev);
                            if (n.has(idx)) n.delete(idx); else n.add(idx);
                            return n;
                          });
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <CategoryIcon category={cat} size={18} />
                          <div className="h3" style={{ color: 'var(--text)', textTransform: 'none', letterSpacing: '-0.02em', fontSize: 17, fontWeight: 600 }}>
                            {title}
                          </div>
                        </div>
                        {rec.amount != null && (
                          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', margin: '4px 0' }}>
                            {rec.currency || ''}{Number(rec.amount).toLocaleString()}
                          </div>
                        )}
                        {(rec.eventDate || rec.deadline) && (
                          <div className="caption">
                            {rec.eventDate ? formatDisplayDate(rec.eventDate, lang) : ''}
                            {rec.deadline && !rec.eventDate ? formatDisplayDate(rec.deadline, lang) : ''}
                          </div>
                        )}
                      </div>
                    </label>

                    <div className="h3" style={{ marginBottom: 6 }}>{t('importantInfo')}</div>
                    <div className="phase4-facts">
                      <div className="fact-row">
                        <span className="fact-label">{t('title')}</span>
                        <span className="fact-value">{title} {statusBadge(getFact('title')?.sourceType)}</span>
                      </div>
                      <div className="fact-row">
                        <span className="fact-label">{t('amount')}</span>
                        <span className="fact-value">
                          {rec.amount != null ? `${rec.currency || ''}${rec.amount}` : t('notFound')}
                          {statusBadge(getFact('amount')?.sourceType)}
                        </span>
                      </div>
                      <div className="fact-row">
                        <span className="fact-label">{t('date')}</span>
                        <span className="fact-value">
                          {rec.eventDate ? formatDisplayDate(rec.eventDate, lang) : (rec.deadline ? formatDisplayDate(rec.deadline, lang) : t('notFound'))}
                          {statusBadge((getFact('eventDate') || getFact('deadline'))?.sourceType)}
                        </span>
                      </div>
                      {getFact('amount')?.sourceText && (
                        <div className="fact-evidence-block">
                          <span className="caption">{t('source')}: “{getFact('amount')?.sourceText}”</span>
                        </div>
                      )}
                      {(getFact('eventDate') || getFact('deadline'))?.sourceText && (
                        <div className="fact-evidence-block">
                          <span className="caption">{t('source')}: “{(getFact('eventDate') || getFact('deadline'))?.sourceText}”</span>
                        </div>
                      )}
                    </div>

                    <div className="h3" style={{ margin: '12px 0 6px' }}>{t('missingInfo')}</div>
                    <div className="phase4-facts">
                      <div className="fact-row">
                        <span className="fact-label">Warranty</span>
                        <span className="fact-value">{t('notFound')} {statusBadge('UNKNOWN')}</span>
                      </div>
                      <div className="fact-row">
                        <span className="fact-label">Return period</span>
                        <span className="fact-value">{t('notFound')} {statusBadge('UNKNOWN')}</span>
                      </div>
                    </div>
                    <p className="caption" style={{ marginTop: 8 }}>{t('notInSource') || "This information wasn't present in the source."}</p>
                  </div>
                );
              })}
            </div>
          )}

          <p className="trust-note">{t('wontGuess')}</p>
          <button type="button" className="btn btn-primary" disabled={selectedIds.size === 0} onClick={handleSave}>
            {t('saveToMemory')}
          </button>
        </div>
      </div>
    );
  }

  if (flow === 'detail' && currentDetail) {
    const r = currentDetail;
    const cd = getCountdownLabel(r.deadline, lang);
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="screen screen-full" style={{ paddingTop: 14 }}>
          <button type="button" className="btn-ghost" onClick={() => { setFlow('none'); setDetailId(null); }} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
            ← {t('back')}
          </button>

          <div className="phase4-detail-header">
            <div className="cat-well" style={{ width: 48, height: 48, borderRadius: 14 }}>
              <CategoryIcon category={r.category} size={22} />
            </div>
            <div className="h1" style={{ marginTop: 14, marginBottom: 4 }}>{r.title}</div>
            {r.isDemo && <span className="badge badge-demo">{t('demoLabel')}</span>}
            {r.amount != null && (
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 8 }}>
                {r.currency || ''}{r.amount.toLocaleString()}
              </div>
            )}
            <div className="body-sm" style={{ marginTop: 6 }}>
              {catLabel(r.category)}
              {r.eventDate && ` · ${formatDisplayDate(r.eventDate, lang)}`}
              {cd && ` · ${cd}`}
            </div>
          </div>

          <div className="detail-block" style={{ marginTop: 20 }}>
            <div className="block-label">{t('importantInfo')}</div>
            <div className="fact-row">
              <span className="fact-label">{t('title')}</span>
              <span className="fact-value">{r.title}</span>
            </div>
            <div className="fact-row">
              <span className="fact-label">{t('amount')}</span>
              <span className="fact-value">{r.amount != null ? `${r.currency || ''}${r.amount}` : t('notFound')}</span>
            </div>
            <div className="fact-row">
              <span className="fact-label">{t('date')}</span>
              <span className="fact-value">{r.eventDate ? formatDisplayDate(r.eventDate, lang) : t('notFound')}</span>
            </div>
            {r.deadline && (
              <div className="fact-row">
                <span className="fact-label">{t('deadline')}</span>
                <span className="fact-value">{formatDisplayDate(r.deadline, lang)}{cd ? ` (${cd})` : ''}</span>
              </div>
            )}
            {r.extractedFacts.filter(f => f.sourceText).map((f) => (
              <div key={f.field} className="fact-evidence-block">
                <span className="caption">{t('source')}: “{f.sourceText}”</span>
              </div>
            ))}
          </div>

          {r.sourceReference && (
            <div className="detail-block">
              <div className="block-label">{t('source')}</div>
              {r.sourceReference && <div className="body-sm" style={{ marginBottom: 6 }}>{r.sourceReference}</div>}
              {r.sourceReference && <div className="phase4-source-text">{r.sourceReference}</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
              const days = 7;
              const d = new Date();
              d.setDate(d.getDate() + days);
              updateRecord(r.id, { reminderSettings: { enabled: true, daysBefore: [7], notifyOnDay: true } });
            }}>{t('remindMe')}</button>
            <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => {
              if (confirm(t('confirmDelete'))) {
                deleteRecord(r.id); setFlow('none'); setDetailId(null);
              }
            }}>{t('delete')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (flow === 'profile-edit') {
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="screen screen-full" style={{ paddingTop: 16 }}>
          <button className="btn-ghost" onClick={() => setFlow('none')} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
            <IconBack /> {t('back')}
          </button>
          <div className="h1" style={{ marginBottom: 24 }}>{t('accountProfile')}</div>
          <label className="photo-upload">
            {draftPhoto ? <img src={draftPhoto} alt="" /> : <span style={{ fontSize: 28, color: 'var(--text-tertiary)' }}>+</span>}
            <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={onPhotoPick} />
          </label>
          <div className="field"><label>{t('firstName')}</label>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} /></div>
          <div className="field"><label>{t('lastName')}</label>
            <input value={draftLast} onChange={(e) => setDraftLast(e.target.value)} /></div>
          <div className="field"><label>{t('emailOptional')}</label>
            <input value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} type="email" /></div>
          <button className="btn btn-primary" onClick={saveProfile}>{t('continue')}</button>
        </div>
      </div>
    );
  }

  /* ─── Appearance settings ─────────────────────────────────── */
  if (flow === 'appearance') {
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="screen screen-full" style={{ paddingTop: 16 }}>
          <button className="btn-ghost" onClick={() => setFlow('none')} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
            <IconBack /> {t('back')}
          </button>
          <div className="h1" style={{ marginBottom: 8 }}>{t('appearance')}</div>
          <p className="caption" style={{ marginBottom: 24 }}>{t('lightDarkMode')}</p>
          <div className="appearance-grid">
            {(['system', 'light', 'dark'] as AppearanceMode[]).map((mode) => (
              <button
                key={mode}
                className={`appearance-opt ${(settings.appearance || 'dark') === mode ? 'active' : ''}`}
                onClick={() => updateSettings({ appearance: mode })}
              >
                <div className={`preview ${mode}`} />
                <span>{mode === 'system' ? t('appearanceSystem') : mode === 'light' ? t('appearanceLight') : t('appearanceDark')}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main shell ──────────────────────────────────────────── */
  return (
    <div className="app-shell" data-theme={theme}>
      {/* HOME */}
      {tab === 'home' && (
        <div className="home-space">
          <CosmicBackground reducedMotion={reducedMotion} sparse />
          <div className="home-scroll">
            {/* Header: greeting + compact orb (reference composition) */}
            <div className="home-header home-header-dash">
              <Avatar />
              <div className="header-text">
                <div className="home-greeting">
                  {t(greetingKey())}{displayName ? `, ${displayName}` : ''}
                </div>
                <p className="home-sub">{t('iveBeenWatching')}</p>
              </div>
              <div className="home-header-orb">
                <MemoryOrbHero
                  reducedMotion={reducedMotion}
                  compact
                  state={
                    (needsAttention.length > 0
                      ? 'urgent'
                      : records.filter((r) => r.status === 'active').length === 0
                        ? 'calm'
                        : 'idle') as OrbState
                  }
                />
              </div>
            </div>

            {needsAttention.length === 0 && comingSoon.length === 0 && records.filter((r) => r.status === 'active').length === 0 ? (
              <div className="home-empty">
                <div className="empty-title">{t('youreCovered')}</div>
                <div className="empty-sub">{t('giveMeCta')}</div>
                <button type="button" className="btn btn-primary btn-sm" style={{ width: 'auto', margin: '0 auto' }} onClick={openAdd}>
                  {t('addSomething')}
                </button>
              </div>
            ) : (
              <>
                {/* TODAY */}
                <section className="home-section">
                  <div className="section-header">
                    <div className="section-label">{t('today')}</div>
                    <button type="button" className="view-all" onClick={() => setTab('memories')}>
                      {t('viewAll')} →
                    </button>
                  </div>
                  {needsAttention.length === 0 ? (
                    <div className="home-quiet">
                      <span className="home-quiet-title">{t('youreCovered')}</span>
                      <span className="home-quiet-sub">{t('nothingNeedsYou')}</span>
                    </div>
                  ) : (
                    <div className="home-list">
                      {needsAttention.map((r) => (
                        <HomeDashRow
                          key={r.id}
                          record={r}
                          lang={lang}
                          t={t}
                          catLabel={catLabel}
                          onClick={() => openDetail(r.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* COMING UP */}
                {comingSoon.length > 0 && (
                  <section className="home-section">
                    <div className="section-header">
                      <div className="section-label">{t('comingUp')}</div>
                      <button type="button" className="view-all" onClick={() => setTab('timeline')}>
                        {t('viewAll')} →
                      </button>
                    </div>
                    <div className="home-list">
                      {comingSoon.map((r) => (
                        <HomeDashRow
                          key={r.id}
                          record={r}
                          lang={lang}
                          t={t}
                          catLabel={catLabel}
                          onClick={() => openDetail(r.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Intelligent status chip */}
                {(needsAttention.length > 0 || comingSoon.length > 0) && (
                  <button
                    type="button"
                    className="home-ai-chip"
                    onClick={() => setTab('timeline')}
                  >
                    <span className="home-ai-chip-icon" aria-hidden>✦</span>
                    <span className="home-ai-chip-text">
                      <span className="home-ai-chip-title">
                        {needsAttention.length > 0
                          ? (needsAttention.length === 1
                              ? t('needAttentionThisWeek')
                              : t('needsAttentionThisWeek', { n: needsAttention.length }))
                          : (comingSoon.length === 1
                              ? t('thingComingUp')
                              : t('thingsComingUp', { n: comingSoon.length }))}
                      </span>
                      <span className="home-ai-chip-sub">{t('iveBeenWatching')}</span>
                    </span>
                    <span className="home-ai-chip-chevron" aria-hidden>›</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'memories' && (
        <div className="screen memories-screen">
          <div className="memories-header">
            <div className="memories-header-top">
              <div>
                <h1 className="memories-title">{t('yourMemory')}</h1>
                <p className="memories-subtitle">{t('everythingRemembered')}</p>
              </div>
              <div className="memories-header-meta">
                {records.filter((r) => r.status !== 'archived').length === 1
                  ? t('memoryCountOne')
                  : t('memoriesCount', { n: records.filter((r) => r.status !== 'archived').length })}
                <span className="memories-orb-dot" aria-hidden />
              </div>
            </div>
            <div className="memories-search field">
              <span className="memories-search-icon" aria-hidden><IconSearch /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchYourMemories')}
                aria-label={t('searchYourMemories')}
                className="memories-search-input"
              />
            </div>
            <div className="memories-filters chips" role="tablist" aria-label={t('memories')}>
              {(['All', 'Deadlines', 'Money', 'Subscriptions', 'Contracts', 'Warranty', 'Returns', 'Documents', 'Other'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  className={`chip memories-chip ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'All' ? t('all')
                    : f === 'Deadlines' ? t('deadlines')
                    : f === 'Money' ? t('money')
                    : f === 'Subscriptions' ? t('subscriptions')
                    : f === 'Contracts' ? t('contracts')
                    : f === 'Warranty' ? t('warranties')
                    : f === 'Returns' ? t('returns')
                    : f === 'Documents' ? t('documents')
                    : t('other')}
                </button>
              ))}
            </div>
          </div>

          {filteredMemories.length === 0 ? (
            search.trim() || filter !== 'All' ? (
              <div className="empty-state memories-empty">
                <div className="empty-title">{t('nothingFoundSearch')}</div>
                <div className="empty-sub">{t('tryAnotherSearch')}</div>
              </div>
            ) : (
              <div className="empty-state memories-empty memories-empty-full">
                <div className="memories-empty-orb">
                  <MemoryOrbHero reducedMotion={reducedMotion} state="idle" />
                </div>
                <div className="empty-title">{t('memoryEmpty')}</div>
                <div className="empty-sub" style={{ marginBottom: 20 }}>{t('giveMeCta')}</div>
                <button type="button" className="btn btn-primary btn-sm" style={{ width: 'auto', margin: '0 auto' }} onClick={openAdd}>
                  {t('addSomething')}
                </button>
              </div>
            )
          ) : memorySections.mode === 'flat' ? (
            <div className="memories-list">
              {memorySections.items.map((r, i) => (
                <MemoryRow
                  key={r.id}
                  record={r}
                  lang={lang}
                  t={t}
                  catLabel={catLabel}
                  onClick={() => openDetail(r.id)}
                  style={reducedMotion ? undefined : { animationDelay: `${Math.min(i, 12) * 28}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="memories-list memories-sections">
              {memorySections.attention.length > 0 && (
                <section className="memory-section" aria-labelledby="sec-attention">
                  <h2 id="sec-attention" className="memory-section-title">{t('needsAttentionSection')}</h2>
                  {memorySections.attention.map((r, i) => (
                    <MemoryRow
                      key={r.id}
                      record={r}
                      lang={lang}
                      t={t}
                      catLabel={catLabel}
                      onClick={() => openDetail(r.id)}
                      emphasize
                      style={reducedMotion ? undefined : { animationDelay: `${i * 28}ms` }}
                    />
                  ))}
                </section>
              )}
              {memorySections.attention.length === 0 && (
                <div className="memories-covered">
                  <span className="memories-covered-label">{t('youreCoveredMemories')}</span>
                  <span className="memories-covered-sub">{t('nothingNeedsAttention')}</span>
                </div>
              )}
              {memorySections.upcoming.length > 0 && (
                <section className="memory-section" aria-labelledby="sec-upcoming">
                  <h2 id="sec-upcoming" className="memory-section-title">{t('comingUpSection')}</h2>
                  {memorySections.upcoming.map((r, i) => (
                    <MemoryRow
                      key={r.id}
                      record={r}
                      lang={lang}
                      t={t}
                      catLabel={catLabel}
                      onClick={() => openDetail(r.id)}
                      style={reducedMotion ? undefined : { animationDelay: `${i * 28}ms` }}
                    />
                  ))}
                </section>
              )}
              {memorySections.recent.length > 0 && (
                <section className="memory-section" aria-labelledby="sec-recent">
                  <h2 id="sec-recent" className="memory-section-title">{t('recentlyAddedSection')}</h2>
                  {memorySections.recent.map((r, i) => (
                    <MemoryRow
                      key={r.id}
                      record={r}
                      lang={lang}
                      t={t}
                      catLabel={catLabel}
                      onClick={() => openDetail(r.id)}
                      style={reducedMotion ? undefined : { animationDelay: `${i * 28}ms` }}
                    />
                  ))}
                </section>
              )}
              {memorySections.rest.length > 0 && (
                <section className="memory-section" aria-labelledby="sec-all">
                  <h2 id="sec-all" className="memory-section-title">{t('allMemoriesSection')}</h2>
                  {memorySections.rest.map((r, i) => (
                    <MemoryRow
                      key={r.id}
                      record={r}
                      lang={lang}
                      t={t}
                      catLabel={catLabel}
                      onClick={() => openDetail(r.id)}
                      style={reducedMotion ? undefined : { animationDelay: `${Math.min(i, 8) * 28}ms` }}
                    />
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* TIMELINE — Phase 6 Your Future */}
      {tab === 'timeline' && (
        <div className="screen future-screen">
          <div className="future-header">
            <div className="future-header-top">
              <div>
                <h1 className="future-title">{t('yourFuture')}</h1>
                <p className="future-subtitle">{t('futureSubtitle')}</p>
              </div>
            </div>
            {timelineItems.length > 0 && (
              <div className="future-summary">
                <span>
                  {timelineItems.length === 1
                    ? t('thingComingUp')
                    : t('thingsComingUp', { n: timelineItems.length })}
                </span>
                {attentionThisWeek > 0 && (
                  <span className="future-summary-attn">
                    {attentionThisWeek === 1
                      ? t('needAttentionThisWeek')
                      : t('needsAttentionThisWeek', { n: attentionThisWeek })}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="future-time-seg" role="tablist" aria-label={t('yourFuture')}>
            {([
              ['today', 'timeToday'],
              ['7', 'time7Days'],
              ['30', 'time30Days'],
              ['all', 'timeAll'],
            ] as const).map(([val, key]) => (
              <button
                key={val}
                type="button"
                role="tab"
                aria-selected={tlRange === val}
                className={`future-seg-btn ${tlRange === val ? 'active' : ''}`}
                onClick={() => setTlRange(val)}
              >
                {t(key)}
              </button>
            ))}
          </div>

          <div className="future-filters chips" role="tablist">
            {(['All', 'Money', 'Deadlines', 'Documents', 'Subscriptions', 'Other'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={tlFilter === f}
                className={`chip memories-chip ${tlFilter === f ? 'active' : ''}`}
                onClick={() => setTlFilter(f)}
              >
                {f === 'All' ? t('all')
                  : f === 'Money' ? t('money')
                  : f === 'Deadlines' ? t('deadlines')
                  : f === 'Documents' ? t('documents')
                  : f === 'Subscriptions' ? t('subscriptions')
                  : t('other')}
              </button>
            ))}
          </div>

          {timelineItems.length === 0 ? (
            <div className="empty-state future-empty">
              <div className="empty-title">{t('futureClear')}</div>
              <div className="empty-sub" style={{ marginBottom: 24 }}>{t('futureClearSub')}</div>
              <button type="button" className="btn btn-primary btn-sm" style={{ width: 'auto', margin: '0 auto' }} onClick={openAdd}>
                + {t('giveMeToRemember')}
              </button>
            </div>
          ) : (
            <>
              {nextImportant && (
                <section className="future-next" aria-labelledby="next-moment-label">
                  <h2 id="next-moment-label" className="future-section-label">{t('nextImportantMoment')}</h2>
                  <button type="button" className="future-next-card" onClick={() => openDetail(nextImportant.id)}>
                    <div className="future-next-icon">
                      <CategoryIcon category={nextImportant.category} size={20} />
                    </div>
                    <div className="future-next-body">
                      <div className="future-next-title">{nextImportant.title}</div>
                      <div className="future-next-meta">
                        {nextImportant.deadline && (
                          <>
                            {t('deadline')}: {formatDisplayDate(nextImportant.deadline, lang)}
                            {getCountdownLabel(nextImportant.deadline, lang) && (
                              <span className={`future-rel ${isUrgent(nextImportant.deadline, 3) ? 'urgent' : isUrgent(nextImportant.deadline, 7) ? 'soon' : ''}`}>
                                {' · '}{getCountdownLabel(nextImportant.deadline, lang)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <span className="future-next-link">{t('viewMemoryArrow')} →</span>
                    </div>
                  </button>
                </section>
              )}

              <div className="future-timeline">
                {timelineBuckets.map((bucket) => (
                  <section key={bucket.key} className="future-bucket" aria-labelledby={`bucket-${bucket.key}`}>
                    <h2 id={`bucket-${bucket.key}`} className="future-bucket-title">
                      {bucket.key === 'today' ? t('bucketToday')
                        : bucket.key === 'thisWeek' ? t('bucketThisWeek')
                        : bucket.key === 'nextWeek' ? t('bucketNextWeek')
                        : bucket.key === 'thisMonth' ? t('bucketThisMonth')
                        : t('bucketLater')}
                    </h2>
                    <div className="future-bucket-list">
                      {bucket.items.map((r, i) => {
                        const cd = getCountdownLabel(r.deadline, lang);
                        const days = daysUntil(r.deadline);
                        const urgent = days !== null && days <= 3;
                        const soon = days !== null && days > 3 && days <= 7;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            className={`future-item ${urgent ? 'is-urgent' : soon ? 'is-soon' : ''}`}
                            onClick={() => openDetail(r.id)}
                            style={reducedMotion ? undefined : { animationDelay: `${Math.min(i, 8) * 30}ms` }}
                            aria-label={`${r.title}. ${cd || ''}`}
                          >
                            <div className="future-item-icon" aria-hidden>
                              <CategoryIcon category={r.category} size={18} />
                            </div>
                            <div className="future-item-body">
                              <div className="future-item-title">{r.title}</div>
                              <div className="future-item-meta">
                                {r.deadline && formatDisplayDate(r.deadline, lang)}
                                {r.amount != null && ` · ${r.currency || ''}${r.amount.toLocaleString()}`}
                              </div>
                            </div>
                            {cd && (
                              <div className={`future-item-status ${urgent ? 'urgent' : soon ? 'soon' : ''}`}>
                                {days === 0 ? t('dueToday') : cd}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {tab === 'settings' && (
        <div className="screen" style={{ paddingTop: 24 }}>
          <div className="profile-header">
            <Avatar size="lg" />
            <div className="name">
              {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || t('profile')}
            </div>
            {profile.email && <div className="email">{profile.email}</div>}
          </div>
          <div className="settings-list">
            <button className="settings-row" onClick={() => {
              setDraftName(profile.firstName); setDraftLast(profile.lastName);
              setDraftEmail(profile.email); setDraftPhoto(profile.photoDataUrl);
              setFlow('profile-edit');
            }}>
              <div className="icon"><IconUser /></div>
              <div className="meta"><div className="title">{t('accountProfile')}</div><div className="sub">{t('personalInfo')}</div></div>
              <span className="chevron">›</span>
            </button>
            <button className="settings-row">
              <div className="icon"><IconBell /></div>
              <div className="meta"><div className="title">{t('notifications')}</div><div className="sub">{t('remindersAlerts')}</div></div>
              <span className="chevron">›</span>
            </button>
            <button className="settings-row" onClick={() => setFlow('appearance')}>
              <div className="icon"><IconSun /></div>
              <div className="meta">
                <div className="title">{t('appearance')}</div>
                <div className="sub">{(settings.appearance || 'dark') === 'system' ? t('appearanceSystem') : (settings.appearance || 'dark') === 'light' ? t('appearanceLight') : t('appearanceDark')}</div>
              </div>
              <span className="chevron">›</span>
            </button>
            <div className="settings-row" style={{ cursor: 'default' }}>
              <div className="icon" style={{ fontSize: 14, fontWeight: 600 }}>A</div>
              <div className="meta"><div className="title">{t('languageLabel')}</div></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={`btn btn-sm ${lang === 'en' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto', height: 32, padding: '0 12px' }} onClick={() => updateSettings({ language: 'en' })}>EN</button>
                <button className={`btn btn-sm ${lang === 'ru' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto', height: 32, padding: '0 12px' }} onClick={() => updateSettings({ language: 'ru' })}>RU</button>
              </div>
            </div>
            <button className="settings-row">
              <div className="icon"><IconShield /></div>
              <div className="meta"><div className="title">{t('privacySecurity')}</div><div className="sub">{t('dataIsSafe')}</div></div>
              <span className="chevron">›</span>
            </button>
            <button className="settings-row">
              <div className="icon"><IconHelp /></div>
              <div className="meta"><div className="title">{t('helpSupport')}</div><div className="sub">{t('getHelp')}</div></div>
              <span className="chevron">›</span>
            </button>
            <button className="settings-row">
              <div className="icon"><IconInfo /></div>
              <div className="meta"><div className="title">{t('aboutApp')}</div><div className="sub">{t('version')}</div></div>
              <span className="chevron">›</span>
            </button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="bottom-nav" ref={navRef}>
        <div
          className={`nav-glass-pill${navPill.ready ? ' is-ready' : ''}${reducedMotion ? ' no-motion' : ''}`}
          style={{ transform: `translateX(${navPill.left}px)`, width: navPill.width || 0 }}
          aria-hidden
        />
        <button
          type="button"
          className={`nav-item ${tab === 'home' ? 'active' : ''}`}
          ref={(el) => { navItemRefs.current.home = el; }}
          onClick={() => setTab('home')}
        ><IconHome />{t('homeNav')}</button>
        <button
          type="button"
          className={`nav-item ${tab === 'memories' ? 'active' : ''}`}
          ref={(el) => { navItemRefs.current.memories = el; }}
          onClick={() => setTab('memories')}
        ><IconList />{t('memories')}</button>
        <button type="button" className="nav-add" onClick={openAdd} aria-label={t('addSomething')}><IconPlus /></button>
        <button
          type="button"
          className={`nav-item ${tab === 'timeline' ? 'active' : ''}`}
          ref={(el) => { navItemRefs.current.timeline = el; }}
          onClick={() => setTab('timeline')}
        ><IconTimeline />{t('timeline')}</button>
        <button
          type="button"
          className={`nav-item ${tab === 'settings' ? 'active' : ''}`}
          ref={(el) => { navItemRefs.current.settings = el; }}
          onClick={() => setTab('settings')}
        ><IconSettings />{t('settings')}</button>
      </nav>

      {/* Add / Capture — Phase 3 full experience */}
      {flow === 'add' && (
        <div className="capture-space" data-theme={theme}>
          <CosmicBackground reducedMotion={reducedMotion} />
          <div className="capture-inner">
            <div className="capture-topbar">
              <button type="button" className="capture-close" onClick={closeFlow} aria-label="Close">×</button>
              <div style={{ width: 36 }} />
            </div>
            <div className="capture-hero">
              <h1>{t('giveMeSomething')}</h1>
              <p>{t('photoDocOrTell')}</p>
            </div>
            <div className="capture-orb-zone">
              <MemoryOrbHero reducedMotion={reducedMotion} state="idle" />
            </div>
            <div className="capture-actions">
              <button
                type="button"
                className="capture-action"
                onClick={() => processInput(
                  'Product photo capture\nSony Headphones\n$399\nPurchase date: September 7, 2026',
                  'camera',
                  'camera-capture.jpg'
                )}
              >
                <div className="ca-icon"><IconCamera /></div>
                <span className="ca-label">{t('snap')}</span>
                <span className="ca-desc">{t('snapDesc')}</span>
              </button>
              <button
                type="button"
                className="capture-action"
                onClick={() => processInput(
                  'Sony Headphones\n$399\nPurchase date: September 7, 2026',
                  'photo',
                  'receipt.jpg'
                )}
              >
                <div className="ca-icon"><IconImage /></div>
                <span className="ca-label">{t('photo')}</span>
                <span className="ca-desc">{t('photoDesc')}</span>
              </button>
              <button
                type="button"
                className="capture-action"
                onClick={() => processInput(
                  'Rental contract expires 2026-12-01. Monthly rent 45000 rubles.',
                  'file',
                  'contract.pdf'
                )}
              >
                <div className="ca-icon"><IconFile /></div>
                <span className="ca-label">{t('file')}</span>
                <span className="ca-desc">{t('fileDesc')}</span>
              </button>
              <button type="button" className="capture-action" onClick={() => setFlow('manual')}>
                <div className="ca-icon"><IconMic /></div>
                <span className="ca-label">{t('tellMe')}</span>
                <span className="ca-desc">{t('tellMeDesc')}</span>
              </button>
            </div>
            <p className="capture-trust">{t('wontGuess')}</p>
          </div>
        </div>
      )}

      {/* Tell Me — natural language capture */}
      {flow === 'manual' && (
        <div className="capture-space" data-theme={theme}>
          <CosmicBackground reducedMotion={reducedMotion} />
          <div className="capture-inner">
            <div className="capture-topbar">
              <button type="button" className="capture-close" onClick={() => setFlow('add')} aria-label="Back">←</button>
              <div style={{ width: 36 }} />
            </div>
            <div className="capture-hero">
              <h1>{t('tellMe')}</h1>
              <p>{t('photoDocOrTell')}</p>
            </div>
            <div className="capture-orb-zone">
              <MemoryOrbHero reducedMotion={reducedMotion} state="idle" />
            </div>
            <div className="tell-panel">
              <textarea
                className="tell-input"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={t('manualPlaceholder')}
                autoFocus
                rows={5}
              />
              <div className="tell-suggestions">
                <button type="button" className="tell-chip" onClick={() => setManualText(lang === 'ru' ? 'Напомни о продлении...' : 'Remind me about...')}>
                  {lang === 'ru' ? 'Напомни о…' : 'Remind me about…'}
                </button>
                <button type="button" className="tell-chip" onClick={() => setManualText(lang === 'ru' ? 'Я купил...' : 'I bought...')}>
                  {lang === 'ru' ? 'Я купил…' : 'I bought…'}
                </button>
                <button type="button" className="tell-chip" onClick={() => setManualText(lang === 'ru' ? 'Это истекает...' : 'This expires...')}>
                  {lang === 'ru' ? 'Это истекает…' : 'This expires…'}
                </button>
                <button type="button" className="tell-chip" onClick={() => setManualText(lang === 'ru' ? 'Мне нужно...' : 'I need to...')}>
                  {lang === 'ru' ? 'Мне нужно…' : 'I need to…'}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!manualText.trim()}
                onClick={() => processInput(manualText, 'manual')}
              >
                {t('submitManual')}
              </button>
              <p className="capture-trust">{t('wontGuess')}</p>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

/** Compact dashboard row — hierarchy: title, type meta, relative status */
function HomeDashRow({
  record,
  lang,
  t,
  catLabel,
  onClick,
}: {
  record: MemoryRecord;
  lang: Language;
  t: (k: TranslationKey, p?: Record<string, string | number>) => string;
  catLabel: (c: Category) => string;
  onClick: () => void;
}) {
  const countdown = getCountdownLabel(record.deadline, lang);
  const urgent = isUrgent(record.deadline, 3);
  const soon = isUrgent(record.deadline, 7) && !urgent;
  const days = daysUntil(record.deadline);
  const status =
    days === 0 ? t('dueToday') : countdown || '';

  return (
    <button type="button" className="dash-row" onClick={onClick} aria-label={`${record.title}. ${status}`}>
      <div className="dash-row-icon" aria-hidden>
        <CategoryIcon category={record.category} size={18} />
      </div>
      <div className="dash-row-body">
        <div className="dash-row-title">{record.title}</div>
        <div className="dash-row-meta">
          {catLabel(record.category)}
          {record.description ? ` · ${record.description.split(/[·.]/)[0].trim().slice(0, 28)}` : ''}
        </div>
      </div>
      {status && (
        <div className={`dash-row-status ${urgent ? 'urgent' : soon ? 'soon' : ''}`}>
          {status}
        </div>
      )}
      <span className="dash-row-chevron" aria-hidden>›</span>
    </button>
  );
}

function MemoryRow({ record, lang, t, catLabel, onClick, style, emphasize }: {
  record: MemoryRecord; lang: Language;
  t: (k: TranslationKey, p?: Record<string, string | number>) => string;
  catLabel: (c: Category) => string; onClick: () => void; style?: CSSProperties;
  emphasize?: boolean;
}) {
  const countdown = getCountdownLabel(record.deadline, lang);
  const urgent = isUrgent(record.deadline, 3);
  const soon = isUrgent(record.deadline, 14) && !urgent;
  const cdClass = urgent ? 'urgent' : soon ? 'soon' : 'ok';

  const amountStr =
    record.amount != null
      ? `${record.currency || ''}${typeof record.amount === 'number' ? record.amount.toLocaleString() : record.amount}`
      : null;

  const dateStr = record.eventDate ? formatDisplayDate(record.eventDate, lang) : null;

  // Line 2: what matters (amount · date or status language)
  let primaryMeta = '';
  if (amountStr && dateStr) primaryMeta = `${amountStr} · ${dateStr}`;
  else if (amountStr) primaryMeta = amountStr;
  else if (dateStr) primaryMeta = dateStr;
  else if (countdown) primaryMeta = countdown;
  else primaryMeta = t('noActionNeeded');

  // Status / attention line prefers deadline language when present
  let statusLine: string | null = null;
  if (countdown) {
    if (record.category === 'Subscription') {
      statusLine = countdown;
    } else if (record.category === 'Warranty' || record.category === 'Return' || record.category === 'Contract') {
      statusLine = countdown;
    } else {
      statusLine = countdown;
    }
  }

  return (
    <button
      type="button"
      className={`memory-row ${emphasize ? 'memory-row-emphasize' : ''} ${urgent ? 'is-urgent' : soon ? 'is-soon' : ''}`}
      onClick={onClick}
      style={style}
      aria-label={`${record.title}. ${primaryMeta}${statusLine ? `. ${statusLine}` : ''}`}
    >
      <div className="cat-well" aria-hidden>
        <CategoryIcon category={record.category} size={18} />
      </div>
      <div className="meta">
        <div className="title">
          {record.title}
          {record.isDemo && (
            <span className="badge badge-demo" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {t('demoLabel')}
            </span>
          )}
        </div>
        <div className="sub memory-row-primary">
          {primaryMeta}
        </div>
        <div className="memory-row-tertiary">
          <span className="memory-row-cat">{catLabel(record.category)}</span>
          {statusLine && primaryMeta !== statusLine && (
            <span className={`memory-row-status ${cdClass}`}>{statusLine}</span>
          )}
        </div>
      </div>
      <span className="memory-row-chevron" aria-hidden>›</span>
    </button>
  );
}

export default App;
