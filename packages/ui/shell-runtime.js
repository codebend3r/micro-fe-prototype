/**
 * Hooks world uses to measure what is on the page. Routing is not in here:
 * wouter owns the URL.
 *
 * No JSX here, so this file needs no build step of its own.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { bus, getProbeSnapshot, measureScripts, subscribeProbe } from '@mfe/shared-core';

export function useProbeSnapshot() {
  return useSyncExternalStore(subscribeProbe, getProbeSnapshot, getProbeSnapshot);
}

export function useBusEvents() {
  return useSyncExternalStore(bus.onLog, bus.getLog, bus.getLog);
}

/** Recomputes whenever the browser reports another script has landed. */
export function useScriptStats() {
  const [stats, setStats] = useState(measureScripts);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setStats(measureScripts()));
    };
    const observer = new PerformanceObserver(update);
    observer.observe({ type: 'resource', buffered: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return stats;
}

/**
 * Puts world's theme where CSS can see it, for the whole document. CSS custom
 * properties cascade from <html> into a remote's DOM even though React state
 * does not, so this is how theming crosses the boundary.
 */
export function useThemeAttribute(theme) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
