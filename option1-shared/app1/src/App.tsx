/**
 * app1, exposed to the Shell as './App'. This is the app that WRITES.
 *
 * Option 1's integration unit is a React component. There is no mount
 * function, no props contract, no event bus. The component reaches the Shell's
 * session through React context, which only works because React and
 * @mfe/session are both federated singletons.
 */
import * as React from 'react';
import { useEffect, useState } from 'react';
import { SESSION_MODULE_TOKEN, useSession } from '@mfe/session';
import { CATALOG, registerApp, updateApp } from '@mfe/shared-core';
import { RemoteBoundary } from '@mfe/ui/chrome';

const identity = registerApp({
  app: 'app1',
  label: 'remote: writes the shared state',
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

  const selection = session?.state.selection ?? [];
  const countFor = (sku: string) => selection.find((item) => item.sku === sku)?.count ?? 0;

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
      </div>

      <div className="note">
        <strong>The buttons below write to state the Shell owns</strong>
        <span>
          Click one and two things happen outside this app: the counter in the Shell header goes up,
          and app2 on the Selection tab sees the new item. app1 never talks to either of them
          directly.
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
              disabled={!session}
              onClick={() => session?.store.addToSelection(part.sku)}
            >
              Add to shared state
            </button>
          </li>
        ))}
      </ul>

      <div className="note">
        <strong>This button crashes app1 on purpose</strong>
        <span>
          It throws during render. Option 1 runs a single React reconciler, so the Shell's error
          boundary catches it and the rest of the Shell keeps working.
        </span>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setBoom(true)}>
          Crash app1
        </button>
      </div>
    </RemoteBoundary>
  );
}
