/**
 * Small concurrency-limited worker pool used by Multi-AI Broadcast.
 * Kept DOM-free so it can be unit tested independently.
 */
export async function runWithConcurrency(items, limit, worker) {
  const normalizedLimit = Math.max(1, Number(limit) || 1);
  const results = new Array(items.length);
  let nextIndex = 0;

  async function consume() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;

      try {
        const value = await worker(items[index], index);
        results[index] = {
          status: 'fulfilled',
          value,
          item: items[index]
        };
      } catch (reason) {
        results[index] = {
          status: 'rejected',
          reason,
          item: items[index]
        };
      }
    }
  }

  const workerCount = Math.min(normalizedLimit, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: workerCount }, consume));
  return results;
}
