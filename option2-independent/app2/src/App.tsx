/**
 * app2's selection screen, on React 19, reading the same store app1 writes to.
 * This is the app that READS.
 *
 * The two remotes never import each other and never share a React tree. They
 * agree on one plain JavaScript object and one event bus, which is the entire
 * cross app protocol in Option 2.
 */
import { useEffect, useState } from 'react';
import { useSession, useStoreState } from '@mfe/session';
import {
  findPart,
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
    updateApp('app2', {
      contextConnected: Boolean(shellContext),
      themeSeen: state.theme,
      channel: 'mount props',
    });
  }, [shellContext, state.theme]);

  if (boom) {
    throw new Error('app2 threw during render, on purpose');
  }

  const { selection } = state;
  const total = selection.reduce((sum, item) => sum + item.count, 0);

  return (
    <RemoteBoundary
      app="app2"
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
        <span className="pill">
          last bus event: {lastEvent ? lastEvent.type : 'none yet'}
        </span>
      </div>

      <div className="note">
        <strong>This list is written by app1, not by app2</strong>
        <span>
          app1 is a React 18 tree and app2 is a React 19 tree. They cannot share components, hooks or
          context, so they share one plain object instead: the store the Shell handed to both of them
          at mount time.
        </span>
      </div>

      {selection.length === 0 ? (
        <div className="empty">
          <strong>Nothing in the shared state yet</strong>
          <span className="small">
            Open the Catalog tab, click Add to shared state, then come back.
          </span>
        </div>
      ) : (
        <ul className="rows">
          {selection.map((item) => (
            <li className="rowitem" key={item.sku}>
              <span className="rowitem-main">
                <span className="rowitem-name">{findPart(item.sku)?.name}</span>
                <span className="rowitem-meta">{item.sku}</span>
              </span>
              <span className="rowitem-state">added x{item.count}</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => store.removeFromSelection(item.sku)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="totals">
        <span className="muted">
          {total} item{total === 1 ? '' : 's'} in the shared state
        </span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => store.clearSelection()}
          disabled={selection.length === 0}
        >
          Clear it
        </button>
      </div>

      <div className="note">
        <strong>This button crashes app2 on purpose</strong>
        <span>
          It throws during render. app2 owns its own React 19 root, so app2's own error boundary
          catches it. The Shell and app1 never find out.
        </span>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setBoom(true)}>
          Crash app2
        </button>
      </div>
    </RemoteBoundary>
  );
}
