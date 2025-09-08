export function diag(tag: string, extra: Record<string, unknown> = {}) {
  console.info(`[CGA] ${tag}`, { ...extra, ts: new Date().toISOString() });
}