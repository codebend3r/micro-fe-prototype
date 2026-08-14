/**
 * app1's catalog screen. This is the app that WRITES. Same product surface as
 * Option 1's app1, reached through a completely different seam.
 *
 * There is no `useSession()` here that works. app1 has its own copy of
 * @mfe/session and its own React, so the Shell's provider is invisible. The
 * component is called with the store and the bus as ordinary props instead.
 */
import { useEffect, useState } from 'react';
import { useSession, useStoreState } from '@mfe/session';
import {
  CATALOG,
  updateApp,
  type AppRecord,
  type Bus,
  type BusEvent,
  type SessionStore,
} from '@mfe/shared-core';
import { RemoteBoundary } from '@mfe/ui/chrome';

export type RemoteProps = {
  store: SessionStore;
  bus: Bus;
  host: string;
};

export default function App({
  store,
  bus,
  identity,
}: RemoteProps & { identity: AppRecord }) {
  const state = useStoreState(store);
  const shellContext = useSession();
  const [lastEvent, setLastEvent] = useState<BusEvent | null>(null);
  const [boom, setBoom] = useState(false);

  useEffect(() => bus.onLog(() => setLastEvent(bus.getLog()[0] ?? null)), [bus]);

  useEffect(() => {
    updateApp('app1', {
      contextConnected: Boolean(shellContext),
      themeSeen: state.theme,
      channel: 'mount props',
    });
  }, [shellContext, state.theme]);

  if (boom) {
    throw new Error('app1 threw during render, on purpose');
  }

  const countFor = (sku: string) =>
    state.selection.find((item) => item.sku === sku)?.count ?? 0;

  return (
    <RemoteBoundary
      app="app1"
      version={identity.reactVersion}
      instanceId={identity.reactId}
      unit="mount(el, props)"
    >
      <div className="row">
        <span className="pill pill-warn">
          <span className="dot" />
          useSession() returned {String(shellContext)}
        </span>
        <span className="pill pill-ok">
          <span className="dot" />
          store arrived as a mount prop
        </span>
        <span className="pill">theme seen: {state.theme}</span>
      </div>

      <div className="note">
        <strong>The buttons below write to state the Shell owns</strong>
        <span>
          Same result as Option 1, different plumbing. There is no context to reach for, so each
          button calls a method on the plain store object the Shell passed in at mount time. The
          Shell re renders in its React 19 tree, app1 re renders in its React 18 tree, and the two
          commits are unrelated. Last event on the shared bus:{' '}
          <span className="mono">{lastEvent ? lastEvent.type : 'none yet'}</span>.
        </span>
      </div>

      <ul className="rows">
        {CATALOG.map((part) => (
          <li className="rowitem" key={part.sku}>
            <span className="rowitem-main">
              <span className="rowitem-name">{part.name}</span>
              <span className="rowitem-meta">
                {part.sku} / {part.category}
              </span>
            </span>
            <span className="rowitem-state">
              {countFor(part.sku) ? `in shared state x${countFor(part.sku)}` : ''}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => store.addToSelection(part.sku)}
            >
              Add to shared state
            </button>
          </li>
        ))}
      </ul>

      <div className="note">
        <strong>This button crashes app1 on purpose</strong>
        <span>
          It throws during render. app1 owns its own React 18 root, so app1's own error boundary
          catches it. The Shell and app2 never find out.
        </span>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setBoom(true)}>
          Crash app1
        </button>
      </div>
    </RemoteBoundary>
  );
}
