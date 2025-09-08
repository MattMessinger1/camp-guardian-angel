import { supabase } from "@/integrations/supabase/client";
import { isPublicRoute } from './routes';

export function installAuthListener(navigate: (to: string) => void, getPath: () => string) {
  supabase.auth.onAuthStateChange((event, session) => {
    // Helpful dev log
    console.info('[AUTH]', { event, hasUser: !!session?.user, path: getPath() });

    const path = getPath();
    // DO NOT redirect on INITIAL_SESSION
    if (event === 'INITIAL_SESSION') return;

    if (event === 'SIGNED_IN') {
      // If user just signed in and is on /login, send them to a home/dashboard page
      if (path === '/login') navigate('/');
      return;
    }

    if (event === 'SIGNED_OUT') {
      // Only gate protected routes
      if (!isPublicRoute(path)) navigate('/login');
      return;
    }
  });
}