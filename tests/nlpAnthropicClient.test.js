/**
 * anthropicClient — pure / mocked-SDK tests.
 *
 * We exercise:
 *   - buildPrompt structure
 *   - estimateInputTokens math
 *   - _validateResult sanitization (clamp, drop unknown categories/flags)
 *   - _extractJson resilience to leading/trailing junk
 *   - classifyBatch success + error paths with a mocked SDK
 */

// Mock the SDK BEFORE requiring the client module, otherwise the lazy
// require inside _getClient() pulls the real module.
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

describe('anthropicClient', () => {
  let client;

  beforeEach(() => {
    jest.resetModules();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockReset();
    client = require('../services/nlp/anthropicClient');
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('buildPrompt', () => {
    test('serializes posts as JSON with id + body + localHints', () => {
      const prompt = client.buildPrompt([
        {
          id: 'obs-1',
          body: 'Análisis EURUSD',
          type: 'text',
          isForwarded: false,
          localSignals: {
            lang: 'es',
            isLikelyPromotional: false,
            promotionalSignals: [],
            emojiCount: 0,
            discountCodes: [],
          },
        },
      ]);
      expect(prompt).toContain('POSTS:');
      expect(prompt).toContain('"id": "obs-1"');
      expect(prompt).toContain('Análisis EURUSD');
      expect(prompt).toContain('"lang": "es"');
    });

    test('truncates very long bodies to 1500 chars', () => {
      const longBody = 'x'.repeat(5000);
      const prompt = client.buildPrompt([{ id: '1', body: longBody, type: 'text' }]);
      // The body inside the JSON should be capped
      const m = prompt.match(/"body":\s*"(x+)"/);
      expect(m).toBeTruthy();
      expect(m[1].length).toBe(1500);
    });

    test('handles missing localSignals gracefully', () => {
      expect(() =>
        client.buildPrompt([{ id: '1', body: 'hola', type: 'text' }])
      ).not.toThrow();
    });
  });

  describe('estimateInputTokens', () => {
    test('returns a positive integer for non-empty prompt', () => {
      expect(client.estimateInputTokens('system', 'user prompt')).toBeGreaterThan(0);
    });

    test('zero on empty prompts', () => {
      expect(client.estimateInputTokens('', '')).toBe(0);
    });
  });

  describe('_validateResult sanitization', () => {
    let instance;
    beforeEach(() => {
      const { AnthropicNlpClientClass } = client;
      instance = new AnthropicNlpClientClass();
    });

    test('drops unknown categories', () => {
      const out = instance._validateResult({
        id: '1',
        categories: ['cripto', 'fakeland', 'trading'],
      });
      expect(out.categories).toEqual(['cripto', 'trading']);
    });

    test('caps categories at 3', () => {
      const out = instance._validateResult({
        id: '1',
        categories: ['cripto', 'finanzas', 'trading', 'tech'],
      });
      expect(out.categories).toHaveLength(3);
    });

    test('clamps sentiment to [-1, 1]', () => {
      expect(instance._validateResult({ id: '1', sentiment: 5 }).sentiment).toBe(1);
      expect(instance._validateResult({ id: '1', sentiment: -3 }).sentiment).toBe(-1);
      expect(instance._validateResult({ id: '1', sentiment: 0.5 }).sentiment).toBe(0.5);
      expect(instance._validateResult({ id: '1', sentiment: 'bad' }).sentiment).toBeNull();
    });

    test('clamps brand_safety_score to [0, 100]', () => {
      expect(instance._validateResult({ id: '1', brand_safety_score: 150 }).brandSafetyScore).toBe(100);
      expect(instance._validateResult({ id: '1', brand_safety_score: -10 }).brandSafetyScore).toBe(0);
    });

    test('drops unknown brand_safety_flags', () => {
      const out = instance._validateResult({
        id: '1',
        brand_safety_flags: ['gambling', 'made_up_flag', 'nsfw'],
      });
      expect(out.brandSafetyFlags).toEqual(['gambling', 'nsfw']);
    });

    test('accepts both snake_case and camelCase keys', () => {
      const out = instance._validateResult({
        id: '1',
        is_promotional: true,
        buyer_intent: 75,
      });
      expect(out.isPromotional).toBe(true);
      expect(out.buyerIntent).toBe(75);
    });

    test('caps topics_keywords at 7 and lowercases', () => {
      const out = instance._validateResult({
        id: '1',
        topics_keywords: ['Bitcoin', 'ETH', 'Binance', 'DeFi', 'NFT', 'Crypto', 'Trading', 'EXTRA'],
      });
      expect(out.topicsKeywords).toHaveLength(7);
      expect(out.topicsKeywords[0]).toBe('bitcoin');
    });
  });

  describe('_extractJson', () => {
    let instance;
    beforeEach(() => {
      const { AnthropicNlpClientClass } = client;
      instance = new AnthropicNlpClientClass();
    });

    test('parses valid JSON', () => {
      expect(instance._extractJson('{"a":1}')).toEqual({ a: 1 });
    });

    test('strips leading prose', () => {
      expect(instance._extractJson('Here is your JSON: {"a":1}')).toEqual({ a: 1 });
    });

    test('strips trailing prose', () => {
      expect(instance._extractJson('{"a":1} done.')).toEqual({ a: 1 });
    });

    test('throws on text without braces', () => {
      expect(() => instance._extractJson('no json here')).toThrow();
    });
  });

  describe('classifyBatch', () => {
    test('empty batch short-circuits', async () => {
      const r = await client.classifyBatch([]);
      expect(r.ok).toBe(true);
      expect(r.results).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('happy path — Anthropic returns a parseable JSON envelope', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: '{"id":"obs-1","lang":"es","categories":["cripto"],"sentiment":0.3,"brand_safety_score":85,"brand_safety_flags":[],"is_promotional":false,"promotional_signals":[],"buyer_intent":10,"topics_keywords":["bitcoin"]}]}',
          },
        ],
        usage: { input_tokens: 120, output_tokens: 80 },
      });

      const r = await client.classifyBatch([
        { id: 'obs-1', body: 'Análisis BTC', type: 'text' },
      ]);
      expect(r.ok).toBe(true);
      expect(r.results).toHaveLength(1);
      expect(r.results[0]).toMatchObject({
        id: 'obs-1',
        lang: 'es',
        categories: ['cripto'],
        sentiment: 0.3,
        brandSafetyScore: 85,
        isPromotional: false,
        buyerIntent: 10,
      });
      expect(r.usage).toEqual({ inputTokens: 120, outputTokens: 80 });
    });

    test('rate-limit error surfaces as ok:false with reason rate_limited', async () => {
      const err = new Error('Rate limit exceeded');
      err.status = 429;
      mockCreate.mockRejectedValueOnce(err);

      const r = await client.classifyBatch([{ id: '1', body: 'hi', type: 'text' }]);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('rate_limited');
      expect(r.status).toBe(429);
    });

    test('unparseable response surfaces as ok:false with reason parse_failed', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'this is not JSON at all' }],
        usage: { input_tokens: 50, output_tokens: 20 },
      });

      const r = await client.classifyBatch([{ id: '1', body: 'hi', type: 'text' }]);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('parse_failed');
      expect(r.usage.inputTokens).toBe(50);
    });
  });

  test('_getClient throws clearly when ANTHROPIC_API_KEY is unset', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { AnthropicNlpClientClass } = client;
    const inst = new AnthropicNlpClientClass();
    expect(() => inst._getClient()).toThrow(/ANTHROPIC_API_KEY/);
  });
});
