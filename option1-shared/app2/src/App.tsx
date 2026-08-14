/**
 * app2, exposed to the Shell as './App'.
 *
 * Nothing here knows that app1 exists. It reads the same session context the
 * Shell provides, so anything app1 writes shows up here on the next render,
 * inside the same React commit.
 */
import * as React from 'react';
import { useEffect, useState } from 'react';
import { SESSION_MODULE_TOKEN, useSession } from '@mfe/session';
import { findPart, formatMoney, registerApp, updateApp } from '@mfe/shared-core';
import { RemoteBoundary } from '@mfe/ui/chrome';

const identity = registerApp({
  app: 'app2',
  label: 'remote: orders',
  role: 'remote',
  react: React,
  sessionToken: SESSION_MODULE_TOKEN,
});

export default function App() {
  const session = useSession();
  const [boom, setBoom] = useState(false);

  useEffect(() => {
    updateApp('app2', {
      contextConnected: Boolean(session),
      themeSeen: session?.state.theme ?? null,
      channel: 'react context',
    });
  }, [session]);

  if (boom) {
    throw new Error('app2 threw during render, on purpose');
  }

  const order = session?.state.order ?? [];
  const total = order.reduce(
    (sum, line) => sum + (findPart(line.sku)?.price ?? 0) * line.qty,
    0,
  );

  return (
    <RemoteBoundary
      app="app2"
      version={identity.reactVersion}
      instanceId={identity.reactId}
      unit="React component"
    >
      <div className="row">
        {session ? (
          <span className="pill pill-ok">
            <span className="dot" />
            useSession() reached the Shell provider
          </span>
        ) : (
          <span className="pill pill-danger">
            <span className="dot" />
            useSession() returned null
          </span>
        )}
        <span className="pill">theme seen: {session?.state.theme ?? 'unknown'}</span>
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
                      onClick={() => session?.store.removeFromOrder(line.sku)}
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
          {order.length} line{order.length === 1 ? '' : 's'} for {session?.state.user.name ?? 'nobody'}
        </span>
        <span className="totals-value">{formatMoney(total)}</span>
      </div>

      <div className="row">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => session?.store.clearOrder()}
          disabled={!session || order.length === 0}
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
