import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { installAuthListener } from '@/lib/auth/listener';

export function AuthListenerInstaller() {
  const navigate = useNavigate();

  useEffect(() => {
    // Install centralized auth listener once at app boot
    installAuthListener(
      (to) => navigate(to),
      () => window.location.pathname
    );
  }, [navigate]);

  return null; // This component just installs the listener
}