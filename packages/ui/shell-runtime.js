/**
 * Hooks both Shells use. Kept in one place on purpose: routing, measurement
 * and the bridge to the comparison harness must be byte for byte identical in
 * Option 1 and Option 2 for the side by side numbers to mean anything.
 *
 * No JSX here, so this file needs no build step of its own.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  bus,
  getProbeSnapshot,
  measureScripts,
  subscribeProbe,
} from '@mfe/shared-core';

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

/** Puts the Shell's theme where CSS can see it, for the whole document. */
export function useThemeAttribute(theme, option) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.option = String(option);
  }, [theme, option]);
}

/**
 * Two way sync between the session store's route and the URL hash.
 *
 * Store to URL: every in app navigation pushes a history entry, so the back
 * and forward buttons walk the routes the user actually visited. The one
 * exception is a Shell embedded in the comparison harness. It shares the tab's
 * history with the other Shell, and two pushes per click would put the pair
 * out of step the first time someone hits back, so embedded Shells replace.
 *
 * URL to store: the initial hash, a hand edited hash, and back or forward all
 * arrive as `hashchange`. Those already have their own entry, so the store
 * update they trigger must not push another one.
 */
export function useHashRoute(store) {
  useEffect(() => {
    const embedded = window.parent !== window;
    let applyingUrl = false;

    const fromHash = () => {
      const path = decodeURIComponent(window.location.hash.slice(1)) || '/overview';
      if (path === store.getState().route) return;
      applyingUrl = true;
      try {
        store.navigate(path);
      } finally {
        applyingUrl = false;
      }
    };

    fromHash();
    window.addEventListener('hashchange', fromHash);

    const unsubscribe = store.subscribe((state) => {
      if (applyingUrl) return;
      const target = `#${state.route}`;
      if (window.location.hash === target) return;
      if (embedded) window.history.replaceState(null, '', target);
      else window.history.pushState(null, '', target);
    });

    return () => {
      window.removeEventListener('hashchange', fromHash);
      unsubscribe();
    };
  }, [store]);
}

/**
 * Lets the comparison harness at :5000 drive both Shells in lockstep.
 * The harness and the Shells are different origins, so `'*'` is the only
 * workable target origin here. Fine for a local prototype, not for production.
 */
export function useCompareBridge(store) {
  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data;
      if (!data || data.source !== 'mfe-compare') return;
      if (data.kind === 'navigate') store.navigate(data.path);
      if (data.kind === 'theme') store.setTheme(data.theme);
      if (data.kind === 'selection:add') store.addToSelection(data.sku);
      if (data.kind === 'selection:clear') store.clearSelection();
      if (data.kind === 'reload') window.location.reload();
    };

    window.addEventListener('message', onMessage);
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'mfe-shell', kind: 'ready' }, '*');
    }
    return () => window.removeEventListener('message', onMessage);
  }, [store]);
}

/** Streams this Shell's probe readings up to the comparison harness. */
export function useTelemetryUplink(option, snapshot, scripts, state) {
  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage(
      {
        source: 'mfe-shell',
        kind: 'telemetry',
        option,
        payload: {
          apps: snapshot.apps,
          reactInstances: snapshot.reactInstances,
          sessionInstances: snapshot.sessionInstances,
          coreInstances: snapshot.coreInstances,
          scripts,
          route: state.route,
          theme: state.theme,
          selectedItems: state.selection.length,
        },
      },
      '*',
    );
  }, [option, snapshot, scripts, state]);
}
