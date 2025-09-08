export function logSearchPhase(phase: string, kv: Record<string, unknown>) {
  console.info(JSON.stringify({ level: "info", component: "search", phase, ...kv, ts: new Date().toISOString() }));
}