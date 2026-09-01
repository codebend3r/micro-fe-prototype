import type { ReactElement, ReactNode } from 'react';
import type { SessionState, SessionStore, Store } from '@mfe/shared-core';

export interface SessionValue {
  state: SessionState;
  store: SessionStore;
}

export const SessionContext: import('react').Context<SessionValue | null>;

export function useStoreState<T>(store: Store<T>): T;
export function SessionProvider(props: {
  store: SessionStore;
  children?: ReactNode;
}): ReactElement;
export function useSession(): SessionValue | null;
