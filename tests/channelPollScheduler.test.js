/**
 * ChannelPollScheduler — pure logic tests.
 *
 * The dynamic parts (Queue/Worker over Redis) are integration territory and
 * require a running Redis instance, so we skip them here. The priority
 * heuristics + interval mapping are pure functions exposed as static
 * methods specifically for this kind of testing.
 */

const {
  ChannelPollSchedulerClass,
  QUEUE_NAME,
  POLL_INTERVALS_MS,
  BULLMQ_PRIORITIES,
} = require('../services/ChannelPollScheduler');

describe('ChannelPollScheduler — static configuration', () => {
  test('queue name is stable (changing it migrates pending jobs to a new queue)', () => {
    expect(QUEUE_NAME).toBe('capa2-channel-metrics');
  });

  test('priorities cover the four levels', () => {
    expect(Object.keys(POLL_INTERVALS_MS).sort()).toEqual(['cold', 'high', 'low', 'standard']);
    expect(Object.keys(BULLMQ_PRIORITIES).sort()).toEqual(['cold', 'high', 'low', 'standard']);
  });

  test('higher semantic priority = lower bullmq numeric priority', () => {
    expect(BULLMQ_PRIORITIES.high).toBeLessThan(BULLMQ_PRIORITIES.standard);
    expect(BULLMQ_PRIORITIES.standard).toBeLessThan(BULLMQ_PRIORITIES.low);
    expect(BULLMQ_PRIORITIES.low).toBeLessThan(BULLMQ_PRIORITIES.cold);
  });

  test('higher semantic priority = shorter poll interval', () => {
    expect(POLL_INTERVALS_MS.high).toBeLessThan(POLL_INTERVALS_MS.standard);
    expect(POLL_INTERVALS_MS.standard).toBeLessThan(POLL_INTERVALS_MS.low);
    expect(POLL_INTERVALS_MS.low).toBeLessThan(POLL_INTERVALS_MS.cold);
  });

  test('poll intervals match the documented schedule (2h/12h/24h/7d)', () => {
    expect(POLL_INTERVALS_MS.high).toBe(2 * 3600 * 1000);
    expect(POLL_INTERVALS_MS.standard).toBe(12 * 3600 * 1000);
    expect(POLL_INTERVALS_MS.low).toBe(24 * 3600 * 1000);
    expect(POLL_INTERVALS_MS.cold).toBe(7 * 24 * 3600 * 1000);
  });
});

describe('ChannelPollSchedulerClass.intervalForPriority', () => {
  test('known priorities map to the documented intervals', () => {
    expect(ChannelPollSchedulerClass.intervalForPriority('high')).toBe(POLL_INTERVALS_MS.high);
    expect(ChannelPollSchedulerClass.intervalForPriority('standard')).toBe(POLL_INTERVALS_MS.standard);
    expect(ChannelPollSchedulerClass.intervalForPriority('low')).toBe(POLL_INTERVALS_MS.low);
    expect(ChannelPollSchedulerClass.intervalForPriority('cold')).toBe(POLL_INTERVALS_MS.cold);
  });

  test('unknown priority falls back to standard', () => {
    expect(ChannelPollSchedulerClass.intervalForPriority('weird')).toBe(POLL_INTERVALS_MS.standard);
    expect(ChannelPollSchedulerClass.intervalForPriority(undefined)).toBe(POLL_INTERVALS_MS.standard);
    expect(ChannelPollSchedulerClass.intervalForPriority(null)).toBe(POLL_INTERVALS_MS.standard);
  });
});

describe('ChannelPollSchedulerClass.recommendPriority — heuristics', () => {
  const rec = ChannelPollSchedulerClass.recommendPriority;

  test('very recent activity (<1d) → high', () => {
    expect(rec({ daysSinceLastPost: 0 })).toBe('high');
    expect(rec({ daysSinceLastPost: 0.5 })).toBe('high');
  });

  test('1-7d activity → standard', () => {
    expect(rec({ daysSinceLastPost: 1.5 })).toBe('standard');
    expect(rec({ daysSinceLastPost: 7 })).toBe('standard');
  });

  test('7-30d activity → low', () => {
    expect(rec({ daysSinceLastPost: 8 })).toBe('low');
    expect(rec({ daysSinceLastPost: 30 })).toBe('low');
  });

  test('>30d activity → cold', () => {
    expect(rec({ daysSinceLastPost: 31 })).toBe('cold');
    expect(rec({ daysSinceLastPost: Infinity })).toBe('cold');
  });

  test('canals with consecutive failures do NOT drop to cold (keep probing)', () => {
    // Should be 'cold' by recency alone, but failures>3 floors it to 'low'
    expect(rec({ daysSinceLastPost: 60, consecutiveFailures: 5 })).toBe('low');
    expect(rec({ daysSinceLastPost: Infinity, consecutiveFailures: 4 })).toBe('low');
  });

  test('failure floor only applies when priority would be cold', () => {
    // High/standard canals are not affected by failures
    expect(rec({ daysSinceLastPost: 0, consecutiveFailures: 5 })).toBe('high');
    expect(rec({ daysSinceLastPost: 3, consecutiveFailures: 5 })).toBe('standard');
    expect(rec({ daysSinceLastPost: 10, consecutiveFailures: 5 })).toBe('low');
  });
});

describe('ChannelPollScheduler — class instantiation', () => {
  test('default singleton instance is exported', () => {
    const inst = require('../services/ChannelPollScheduler');
    expect(typeof inst.start).toBe('function');
    expect(typeof inst.stop).toBe('function');
    expect(typeof inst.pauseAll).toBe('function');
    expect(typeof inst.resumeAll).toBe('function');
    expect(typeof inst.getHealthSnapshot).toBe('function');
    expect(inst.running).toBe(false);
  });

  test('getHealthSnapshot when not started reports running:false', async () => {
    const inst = require('../services/ChannelPollScheduler');
    const health = await inst.getHealthSnapshot();
    expect(health.running).toBe(false);
    expect(health.reason).toMatch(/not started/i);
  });
});
