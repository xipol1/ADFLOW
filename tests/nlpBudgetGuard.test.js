/**
 * LLMBudgetGuard — in-memory fallback tests (no Redis).
 *
 * Forces the memory fallback path by leaving REDIS_URL unset. Validates
 * estimation math, monthly cap enforcement, accumulation, and the 80%
 * alert emission (once per month).
 */

const path = require('path');

describe('LLMBudgetGuard — in-memory fallback', () => {
  let guard;
  let warnSpy;
  let originalEnv;

  beforeEach(() => {
    // Fresh module instance per test — _connectAttempted state is preserved
    // across tests otherwise.
    jest.resetModules();
    originalEnv = { ...process.env };
    delete process.env.REDIS_URL;
    delete process.env.LLM_MONTHLY_BUDGET_EUR;
    delete process.env.LLM_HAIKU_INPUT_EUR_PER_MTOKEN;
    delete process.env.LLM_HAIKU_OUTPUT_EUR_PER_MTOKEN;
    guard = require('../services/nlp/LLMBudgetGuard');
    guard._resetMemoryForTests();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    warnSpy.mockRestore();
  });

  describe('estimateCostEur', () => {
    test('default rates approximate Anthropic Haiku pricing', () => {
      // 1M input + 1M output at default ~0.74 + ~3.70 = ~€4.44
      const cost = guard.estimateCostEur({ inputTokens: 1_000_000, outputTokens: 1_000_000 });
      expect(cost).toBeCloseTo(4.44, 1);
    });

    test('zero tokens → zero cost', () => {
      expect(guard.estimateCostEur({ inputTokens: 0, outputTokens: 0 })).toBe(0);
    });

    test('respects custom rates from env', () => {
      process.env.LLM_HAIKU_INPUT_EUR_PER_MTOKEN = '1';
      process.env.LLM_HAIKU_OUTPUT_EUR_PER_MTOKEN = '5';
      expect(guard.estimateCostEur({ inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(6);
    });

    test('small token counts produce small costs', () => {
      // Typical batch: 1k input, 2k output → very small euros
      const cost = guard.estimateCostEur({ inputTokens: 1000, outputTokens: 2000 });
      expect(cost).toBeLessThan(0.01);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('canSpend', () => {
    test('allows when current + estimate is within cap', async () => {
      process.env.LLM_MONTHLY_BUDGET_EUR = '50';
      const r = await guard.canSpend(10);
      expect(r.allowed).toBe(true);
      expect(r.spentEur).toBe(0);
      expect(r.budgetEur).toBe(50);
    });

    test('denies when projected total would exceed cap', async () => {
      process.env.LLM_MONTHLY_BUDGET_EUR = '50';
      await guard.recordSpend(45);
      const r = await guard.canSpend(10); // 45 + 10 = 55 > 50
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe('over_budget');
      expect(r.spentEur).toBe(45);
      expect(r.wouldBeEur).toBe(55);
    });

    test('denies when budget is zero/disabled', async () => {
      process.env.LLM_MONTHLY_BUDGET_EUR = '0';
      const r = await guard.canSpend(0.01);
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe('budget_disabled');
    });
  });

  describe('recordSpend', () => {
    test('accumulates across calls', async () => {
      await guard.recordSpend(1);
      await guard.recordSpend(2);
      await guard.recordSpend(0.5);
      expect(await guard.getCurrentSpendEur()).toBeCloseTo(3.5, 6);
    });

    test('ignores zero and negative costs', async () => {
      await guard.recordSpend(0);
      await guard.recordSpend(-5);
      expect(await guard.getCurrentSpendEur()).toBe(0);
    });

    test('emits 80%% alert when crossing threshold (once)', async () => {
      process.env.LLM_MONTHLY_BUDGET_EUR = '10';
      await guard.recordSpend(7); // 70% — below threshold
      expect(warnSpy).not.toHaveBeenCalled();
      await guard.recordSpend(1); // 80% — crosses
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/80%/);
      await guard.recordSpend(0.5); // still above 80%, but already alerted
      expect(warnSpy).toHaveBeenCalledTimes(1); // not called again
    });

    test('alert message includes spent and budget', async () => {
      process.env.LLM_MONTHLY_BUDGET_EUR = '20';
      await guard.recordSpend(18); // 90%, crosses
      expect(warnSpy.mock.calls[0][0]).toContain('18.00');
      expect(warnSpy.mock.calls[0][0]).toContain('20.00');
    });
  });

  describe('getHealthSnapshot', () => {
    test('reports budget + usage state', async () => {
      process.env.LLM_MONTHLY_BUDGET_EUR = '25';
      await guard.recordSpend(5);
      const h = await guard.getHealthSnapshot();
      expect(h.budgetEur).toBe(25);
      expect(h.spentEur).toBe(5);
      expect(h.remainingEur).toBe(20);
      expect(h.usagePct).toBe(20);
      expect(h.source).toBe('memory');
      expect(h.monthKey).toMatch(/capa2:llm-spend:\d{4}-\d{2}/);
    });
  });
});
