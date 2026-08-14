/**
 * app1, exposed to the Shell as './App'.
 *
 * Option 1's integration unit is a React component. There is no mount
 * function, no props contract, no event bus. The component reaches the Shell's
 * session through React context, which only works because React and
 * @mfe/session are both federated singletons.
 */
import * as React from 'react';
import { useEffect, useState } from 'react';
import { SESSION_MODULE_TOKEN, useSession } from '@mfe/session';
import { CATALOG, formatMoney, registerApp, updateApp } from '@mfe/shared-core';
import { RemoteBoundary } from '@mfe/ui/chrome';

const identity = registerApp({
  app: 'app1',
  label: 'remote: inventory',
  role: 'remote',
  react: React,
  sessionToken: SESSION_MODULE_TOKEN,
});

export default function App() {
  const session = useSession();
  const [boom, setBoom] = useState(false);

  useEffect(() => {
    updateApp('app1', {
      contextConnected: Boolean(session),
      themeSeen: session?.state.theme ?? null,
      channel: 'react context',
    });
  }, [session]);

  if (boom) {
    throw new Error('app1 threw during render, on purpose');
  }

  const order = session?.state.order ?? [];
  const qtyFor = (sku: string) => order.find((line) => line.sku === sku)?.qty ?? 0;

  return (
    <RemoteBoundary
      app="app1"
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
        <span className="pill">route: {session?.state.route ?? 'unknown'}</span>
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
                disabled={!session}
                onClick={() => session?.store.addToOrder(part.sku)}
              >
                Add
              </button>
            </span>
          </article>
        ))}
      </div>

      <div className="note">
        <strong>Why the Add button needs no wiring</strong>
        <span>
          The Shell created the store and rendered a provider around its whole tree. app1 is inside
          that tree, on the same React instance, so <span className="mono">useSession()</span> finds
          it. Adding a part re renders the Shell header and app2 in the same React commit.
        </span>
      </div>

      <div className="row">
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setBoom(true)}>
          Throw a render error
        </button>
        <span className="small muted">the Shell's error boundary will catch it</span>
      </div>
    </RemoteBoundary>
  );
}
