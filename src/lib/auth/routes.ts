export const PUBLIC_ROUTES = new Set<string>([
  '/', '/search', '/results', '/readiness', '/privacy', '/terms', '/login'
]);

export function isPublicRoute(pathname: string) {
  // normalize without trailing slash
  const p = pathname.replace(/\/+$/, '') || '/';
  return PUBLIC_ROUTES.has(p);
}