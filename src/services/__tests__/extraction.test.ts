/**
 * Demo provider extraction safety tests.
 * Run: npm run test:extraction
 */
import { demoProvider } from '../providers/demoProvider.ts';

async function assert(name: string, cond: boolean): Promise<void> {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  ✓ ${name}`);
}

export async function runExtractionTests(): Promise<void> {
  console.log('Demo extraction safety tests…');

  // 1. Receipt — no warranty/return invention
  {
    const r = await demoProvider.extractInformation({
      text: 'Sony Headphones\n$399\nPurchase date: September 7, 2026',
      sourceType: 'photo',
    });
    const rec = r.records[0];
    await assert('price extracted', rec?.amount === 399);
    await assert('currency extracted', rec?.currency === '$' || rec?.currency === 'USD');
    await assert('date extracted', !!(rec?.eventDate || rec?.deadline));
    const warranty = rec?.extractedFacts?.find((f) => f.field === 'warranty');
    const ret = rec?.extractedFacts?.find((f) => f.field === 'returnDeadline');
    await assert('warranty is null', warranty?.value === null);
    await assert('return is null', ret?.value === null);
  }

  // 2. No invented warranty when return mentioned
  {
    const r = await demoProvider.extractInformation({
      text: 'Item purchased. Return by October 15, 2026. Price $50.',
      sourceType: 'manual',
    });
    const warranty = r.records[0]?.extractedFacts?.find((f) => f.field === 'warranty');
    await assert('no invented warranty', warranty?.value === null);
  }

  // 3. Russian deadline
  {
    const r = await demoProvider.extractInformation({
      text: 'Моя страховка заканчивается 3 ноября 2026.',
      sourceType: 'manual',
    });
    await assert('russian language detected', r.language === 'ru');
    await assert('deadline extracted from russian', !!r.records[0]?.deadline);
  }

  // 4. Recurring subscription
  {
    const r = await demoProvider.extractInformation({
      text: 'My gym membership renews every month on the 3rd for 2,500 rubles.',
      sourceType: 'manual',
    });
    const rec = r.records[0];
    await assert('recurrence monthly', rec?.recurrence === 'monthly');
    await assert('amount 2500', rec?.amount === 2500);
    await assert('currency rubles', rec?.currency === '₽');
    await assert('next deadline calculated', !!rec?.deadline);
  }

  // 5. Empty input
  {
    const r = await demoProvider.extractInformation({ text: '', sourceType: 'manual' });
    await assert(
      'no fabricated records for empty',
      r.records.length === 0 || r.confidence === 'low' || r.confidence === 'unknown'
    );
  }

  // 6. Ambiguous date warning
  {
    const r = await demoProvider.extractInformation({
      text: 'Payment due tomorrow',
      sourceType: 'manual',
    });
    await assert(
      'ambiguous date produces warning',
      r.warnings.some(
        (w) =>
          w.code === 'AMBIGUOUS_DATE' ||
          w.code === 'CONFIRM_DATE' ||
          w.code === 'LOW_SIGNAL'
      )
    );
  }

  // 7. Mixed language detection
  {
    const r = await demoProvider.extractInformation({
      text: 'My договор ends 2026-12-01 for 45000 рублей',
      sourceType: 'manual',
    });
    await assert(
      'mixed or detectable language',
      r.language === 'mixed' || r.language === 'ru' || r.language === 'en'
    );
  }

  console.log('All demo extraction tests passed.');
}

runExtractionTests().catch((e: unknown) => {
  console.error(e);
  throw e;
});
