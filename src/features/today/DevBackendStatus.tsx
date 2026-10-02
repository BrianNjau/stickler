import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { Text } from '@/ui';

type Status = 'not configured' | 'checking' | 'signed out' | 'signed in' | 'unreachable';

/** Development-only readout proving the Supabase client is wired. Not rendered in release builds. */
export function DevBackendStatus() {
  const [status, setStatus] = useState<Status>(supabase ? 'checking' : 'not configured');

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setStatus('unreachable');
        else setStatus(data.session ? 'signed in' : 'signed out');
      })
      .catch(() => mounted && setStatus('unreachable'));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Text variant="mono" tone="ink2" style={{ fontSize: 12 }}>
      dev · supabase: {status}
    </Text>
  );
}
