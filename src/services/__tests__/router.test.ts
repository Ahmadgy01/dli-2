/**
 * AI Router smoke tests.
 */
import { AIRouter } from "../providers/router.ts";
import { demoProvider } from "../providers/demoProvider.ts";

async function assert(name: string, cond: boolean) {
  if (!cond) throw new Error("FAIL: " + name);
  console.log("  ✓ " + name);
}

async function run() {
  console.log("AI Router tests…");
  const router = new AIRouter({ preferredOrder: ["demo"], allowDemoFallback: true });
  const r = await router.extract({ text: "Sony Headphones $399. Purchase date: 2026-09-07.", sourceType: "photo" });
  await assert("records", r.records.length >= 1);
  await assert("meta", !!r.meta?.providerId);
  await assert("demo provider", r.meta?.providerId === "demo");
  await assert("outcome", !!r.outcome);
  await assert("amount", r.records[0]?.amount === 399);
  const w = r.records[0]?.extractedFacts?.find((f) => f.field === "warranty");
  await assert("warranty NOT_FOUND", w?.status === "NOT_FOUND" || w?.value === null);
  await assert("demo available", demoProvider.isAvailable() === true);
  console.log("All router tests passed.");
}
run().catch((e) => { console.error(e); throw e; });
