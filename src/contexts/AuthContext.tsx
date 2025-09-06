import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timed out, setting loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Get current session first
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (mounted) {
          if (error) {
            console.error('Auth session error:', error);
          }
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setLoading(false);
          clearTimeout(timeout);
        }
      })
      .catch((error) => {
        if (mounted) {
          console.error('Auth initialization failed:', error);
          setLoading(false);
          clearTimeout(timeout);
        }
      });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (mounted) {
        console.log('Auth state changed:', event, newSession?.user?.id || 'no user');
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
