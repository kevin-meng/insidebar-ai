import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from '../modules/broadcast-manager.js';

describe('runWithConcurrency', () => {
  it('preserves item order and captures failures', async () => {
    const results = await runWithConcurrency(['a', 'b', 'c'], 2, async item => {
      if (item === 'b') throw new Error('boom');
      return item.toUpperCase();
    });

    expect(results[0].value).toBe('A');
    expect(results[1].status).toBe('rejected');
    expect(results[2].value).toBe('C');
  });

  it('never exceeds the requested concurrency', async () => {
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency([1, 2, 3, 4, 5], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
