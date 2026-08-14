/**
 * app1's inventory screen. Same product surface as Option 1's app1, reached
 * through a completely different seam.
 *
 * There is no `useSession()` here that works. app1 has its own copy of
 * @mfe/session and its own React, so the Shell's provider is invisible. The
 * component is called with the store and the bus as ordinary props instead.
 */
import { useEffect, useState } from 'react';
import { useSession, useStoreState } from '@mfe/session';
import {
  CATALOG,
  formatMoney,
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

  const qtyFor = (sku: string) => state.order.find((line) => line.sku === sku)?.qty ?? 0;

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

      <div className="parts">
        {CATALOG.map((part) => (
          <article className="part" key={part.sku}>
            <span className="part-sku">{part.sku}</span>
            <span className="part-name">{part.name}</span>
            <span className="part-meta">
              <span>
                {part.category}, {part.stock} in stock
              </span>
              <span className="part-price">{formatMoney(part.price)}</span>
            </span>
            <span className="part-meta">
              <span className="small muted">
                {qtyFor(part.sku) ? `${qtyFor(part.sku)} on this order` : 'not ordered'}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => store.addToOrder(part.sku)}
              >
                Add
              </button>
            </span>
          </article>
        ))}
      </div>

      <div className="note">
        <strong>How the Add button reaches the Shell</strong>
        <span>
          It calls a method on the plain store object the Shell passed in at mount time. The Shell
          re renders in its React 19 tree, app1 re renders in its React 18 tree, and the two commits
          are unrelated. Last event on the shared bus:{' '}
          <span className="mono">{lastEvent ? lastEvent.type : 'none yet'}</span>.
        </span>
      </div>

      <div className="row">
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setBoom(true)}>
          Throw a render error
        </button>
        <span className="small muted">app1's own boundary catches it, not the Shell's</span>
      </div>
    </RemoteBoundary>
  );
}
