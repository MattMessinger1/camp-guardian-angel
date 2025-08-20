import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Readiness() {
  console.log('🚀 Readiness component is mounting!');
  
  const { user, loading: authLoading } = useAuth();
  console.log('👤 Auth state:', { user: !!user, authLoading });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('⚡ useEffect triggered - user:', !!user, 'authLoading:', authLoading);
    
    // Don't proceed until auth is done loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    if (user) {
      console.log('✅ User found, would load plan...');
      // For now, just set loading to false to test
      setTimeout(() => {
        console.log('✅ Simulated plan load complete');
        setLoading(false);
      }, 1000);
    } else {
      console.log('❌ No user, setting loading to false');
      setLoading(false);
    }
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading readiness page...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Registration Readiness</h1>
          <p className="text-muted-foreground mt-2">
            Test page - checking if component mounts properly.
          </p>
          <div className="mt-4 p-4 bg-muted rounded">
            <p><strong>Auth Loading:</strong> {authLoading ? 'Yes' : 'No'}</p>
            <p><strong>User Present:</strong> {user ? 'Yes' : 'No'}</p>
            <p><strong>Component State:</strong> Mounted successfully!</p>
          </div>
        </div>
      </div>
    </div>
  );
}