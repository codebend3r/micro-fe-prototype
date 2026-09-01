/**
 * @mfe/session
 *
 * The React binding for the session store.
 *
 * Nothing is federated as shared, so each app bundles its own copy of this
 * file and its own React. That means each app calls `createContext()` for
 * itself and ends up with a different context object: a remote's
 * `useSession()` cannot see world's `<SessionProvider>` and returns null.
 * Remotes use `useStoreState(store)` instead, against the plain store handed
 * to them through their mount props. World uses the provider for its own tree.
 *
 * Written with `createElement` rather than JSX so the package needs no build
 * step of its own and can be consumed as source by every app.
 */
import { createContext, createElement, useContext, useSyncExternalStore } from 'react';

export const SessionContext = createContext(null);

/** Subscribes any plain store to React. */
export function useStoreState(store) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function SessionProvider({ store, children }) {
  const state = useStoreState(store);
  return createElement(SessionContext.Provider, { value: { state, store } }, children);
}

/**
 * Returns null when the caller cannot reach world's provider, which is the
 * normal and expected result inside a remote.
 */
export function useSession() {
  return useContext(SessionContext);
}
