import type { MemoryRecord, ExtractedFact } from '../types';
import { v4 as uuidv4 } from 'uuid';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function fact(
  field: string,
  value: string | number | null,
  confidence: ExtractedFact['confidence'] = 'high',
  sourceText: string | null = null
): ExtractedFact {
  return {
    field,
    value,
    sourceText,
    confidence: value === null ? 'unknown' : confidence,
    sourceType: value === null ? 'UNKNOWN' : 'EXTRACTED',
  };
}

export function createDemoRecords(): MemoryRecord[] {
  const now = new Date().toISOString();

  const gymDeadline = (() => {
    const n = new Date();
    let d = new Date(n.getFullYear(), n.getMonth(), 3);
    if (d <= n) d = new Date(n.getFullYear(), n.getMonth() + 1, 3);
    return d.toISOString().slice(0, 10);
  })();

  return [
    {
      id: uuidv4(),
      title: 'Sony WH-1000XM5 Headphones',
      category: 'Warranty',
      description:
        'Purchased Sony WH-1000XM5 noise-cancelling headphones. Includes 1-year manufacturer warranty.',
      sourceType: 'demo',
      amount: 399,
      currency: 'USD',
      eventDate: daysAgo(45),
      deadline: daysFromNow(320),
      recurrence: null,
      renewalDay: null,
      reminderSettings: { enabled: true, daysBefore: [30, 7], notifyOnDay: true },
      status: 'active',
      extractedFacts: [
        fact('title', 'Sony WH-1000XM5 Headphones', 'high'),
        fact('amount', 399, 'high', '$399'),
        fact('currency', 'USD', 'high'),
        fact('deadline', daysFromNow(320), 'medium'),
      ],
      confidence: 'high',
      notes: 'Keep receipt and box for warranty claims.',
      evidence: [],
      language: 'en',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      title: 'Gym Membership',
      category: 'Subscription',
      description:
        'Monthly gym membership at FitLife. Renews on the 3rd of each month for 2,500 rubles.',
      sourceType: 'demo',
      amount: 2500,
      currency: '₽',
      eventDate: null,
      deadline: gymDeadline,
      recurrence: 'monthly',
      renewalDay: 3,
      reminderSettings: { enabled: true, daysBefore: [3, 1], notifyOnDay: true },
      status: 'active',
      extractedFacts: [
        fact('title', 'Gym Membership', 'high'),
        fact('amount', 2500, 'high', '2,500 rubles'),
        fact('currency', '₽', 'high'),
        fact('recurrence', 'monthly', 'high', 'every month on the 3rd'),
        fact('renewalDay', 3, 'high'),
      ],
      confidence: 'high',
      notes: 'Can pause for up to 1 month per year.',
      evidence: [],
      language: 'en',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      title: 'Medical Insurance Policy',
      category: 'Document',
      description: 'Annual medical insurance policy. Expires at the end of the coverage period.',
      sourceType: 'demo',
      amount: null,
      currency: null,
      eventDate: daysAgo(200),
      deadline: daysFromNow(18),
      recurrence: 'yearly',
      renewalDay: null,
      reminderSettings: { enabled: true, daysBefore: [30, 14, 7], notifyOnDay: true },
      status: 'active',
      extractedFacts: [
        fact('title', 'Medical Insurance Policy', 'high'),
        fact('deadline', daysFromNow(18), 'high'),
        fact('recurrence', 'yearly', 'medium'),
      ],
      confidence: 'high',
      notes: 'Policy number on the card in the wallet.',
      evidence: [],
      language: 'en',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      title: 'University Tuition Payment',
      category: 'Deadline',
      description: 'Fall semester tuition payment deadline.',
      sourceType: 'demo',
      amount: 125000,
      currency: '₽',
      eventDate: null,
      deadline: daysFromNow(5),
      recurrence: null,
      renewalDay: null,
      reminderSettings: { enabled: true, daysBefore: [7, 3, 1], notifyOnDay: true },
      status: 'active',
      extractedFacts: [
        fact('title', 'University Tuition Payment', 'high'),
        fact('amount', 125000, 'high'),
        fact('currency', '₽', 'high'),
        fact('deadline', daysFromNow(5), 'high'),
      ],
      confidence: 'high',
      notes: 'Pay via university portal.',
      evidence: [],
      language: 'en',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      title: 'Apartment Rental Contract',
      category: 'Contract',
      description: 'One-year rental agreement for the apartment. Ends on the specified date.',
      sourceType: 'demo',
      amount: 45000,
      currency: '₽',
      eventDate: daysAgo(280),
      deadline: daysFromNow(85),
      recurrence: null,
      renewalDay: null,
      reminderSettings: { enabled: true, daysBefore: [60, 30, 14], notifyOnDay: true },
      status: 'active',
      extractedFacts: [
        fact('title', 'Apartment Rental Contract', 'high'),
        fact('amount', 45000, 'medium'),
        fact('currency', '₽', 'medium'),
        fact('deadline', daysFromNow(85), 'high'),
      ],
      confidence: 'high',
      notes: 'Deposit of 45,000 ₽ held by landlord.',
      evidence: [],
      language: 'en',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
