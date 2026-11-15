// shortcut: in-process queue, move to BullMQ+Redis when multi-instance.
// Jobs for the same conversation run one after another; different conversations run in parallel.
const chains = new Map<string, Promise<void>>();

export function enqueue(key: string, job: () => Promise<void>): Promise<void> {
  const prev = chains.get(key) ?? Promise.resolve();
  const next = prev
    .then(job)
    .catch((err) => console.error(`[queue] job for ${key} failed`, err));
  chains.set(key, next);
  void next.finally(() => {
    if (chains.get(key) === next) chains.delete(key);
  });
  return next;
}
