/**
 * app2's orders screen, on React 19, reading the same store app1 writes to.
 *
 * The two remotes never import each other and never share a React tree. They
 * agree on one plain JavaScript object and one event bus, which is the entire
 * cross app protocol in Option 2.
 */
import { useEffect, useState } from 'react';
import { useSession, useStoreState } from '@mfe/session';
import {
  findPart,
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
    updateApp('app2', {
      contextConnected: Boolean(shellContext),
      themeSeen: state.theme,
      channel: 'mount props',
    });
  }, [shellContext, state.theme]);

  if (boom) {
    throw new Error('app2 threw during render, on purpose');
  }

  const { order } = state;
  const total = order.reduce(
    (sum, line) => sum + (findPart(line.sku)?.price ?? 0) * line.qty,
    0,
  );

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

      {order.length === 0 ? (
        <div className="empty">
          <strong>No lines yet</strong>
          <span className="small">Add a few parts in Inventory, then come back.</span>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Part</th>
              <th className="num">Qty</th>
              <th className="num">Line total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {order.map((line) => {
              const part = findPart(line.sku);
              return (
                <tr key={line.sku}>
                  <td>
                    <strong>{part?.name}</strong>
                    <br />
                    <span className="small muted mono">{line.sku}</span>
                  </td>
                  <td className="num mono">{line.qty}</td>
                  <td className="num mono">{formatMoney((part?.price ?? 0) * line.qty)}</td>
                  <td className="num">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => store.removeFromOrder(line.sku)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="totals">
        <span className="muted">
          {order.length} line{order.length === 1 ? '' : 's'} for {state.user.name}
        </span>
        <span className="totals-value">{formatMoney(total)}</span>
      </div>

      <div className="row">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => store.clearOrder()}
          disabled={order.length === 0}
        >
          Clear order
        </button>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setBoom(true)}>
          Throw a render error
        </button>
      </div>
    </RemoteBoundary>
  );
}
