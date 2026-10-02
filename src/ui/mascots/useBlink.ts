import { useEffect, useState } from 'react';

/** True for `closedMs` once every `everyMs`. A discrete swap, so it renders identically on web and native. */
export function useBlink(enabled: boolean, everyMs: number, closedMs: number): boolean {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let reopen: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setClosed(true);
      reopen = setTimeout(() => setClosed(false), closedMs);
    }, everyMs);
    return () => {
      clearInterval(id);
      if (reopen) clearTimeout(reopen);
    };
  }, [enabled, everyMs, closedMs]);

  // A blink caught mid-way when disabled must not leave the eyes shut.
  return enabled && closed;
}
