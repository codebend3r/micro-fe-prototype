/**
 * @mfe/session
 *
 * The React binding for the session store. This module is the whole argument
 * between the two options, in about forty lines.
 *
 * Option 1 federates it as `singleton: true` alongside React itself, so the
 * Shell's `<SessionProvider>` and a remote's `useSession()` are talking about
 * literally the same `SessionContext` object. Context crosses the app
 * boundary and remotes need no wiring at all.
 *
 * Option 2 shares nothing. Each app bundles its own copy of this file, so each
 * app calls `createContext()` for itself and ends up with a different context
 * object. A remote's `useSession()` then finds no matching provider above it
 * and returns null, which is exactly what the UI reports. Option 2 remotes use
 * `useStoreState(store)` instead, against the plain store handed to them
 * through their mount props.
 *
 * Written with `createElement` rather than JSX so the package needs no build
 * step of its own and can be consumed as source by every app.
 */
import { createContext, createElement, useContext, useSyncExternalStore } from 'react';

/** Fresh object per module instance, so duplicates are countable. */
export const SESSION_MODULE_TOKEN = { module: '@mfe/session' };

export const SessionContext = createContext(null);

/** Subscribes any plain store to React. Works on React 18 and 19. */
export function useStoreState(store) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function SessionProvider({ store, children }) {
  const state = useStoreState(store);
  return createElement(SessionContext.Provider, { value: { state, store } }, children);
}

/**
 * Returns null when the caller cannot reach the Shell's provider, which is the
 * normal and expected result in Option 2.
 */
export function useSession() {
  return useContext(SessionContext);
}
