/**
 * app2, exposed to the Shell as './App'. This is the app that READS.
 *
 * Nothing here knows that app1 exists. It reads the same session context the
 * Shell provides, so anything app1 writes shows up here on the next render,
 * inside the same React commit.
 */
import * as React from 'react';
import { useEffect, useState } from 'react';
import { SESSION_MODULE_TOKEN, useSession } from '@mfe/session';
import { findPart, registerApp, updateApp } from '@mfe/shared-core';
import { RemoteBoundary } from '@mfe/ui/chrome';

const identity = registerApp({
  app: 'app2',
  label: 'remote: reads the shared state',
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

  const selection = session?.state.selection ?? [];
  const total = selection.reduce((sum, item) => sum + item.count, 0);

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

      <div className="note">
        <strong>This list is written by app1, not by app2</strong>
        <span>
          The two remotes never import or call each other. They both read the one piece of state the
          Shell owns, so whatever you add on the Catalog tab appears here.
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
                onClick={() => session?.store.removeFromSelection(item.sku)}
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
          onClick={() => session?.store.clearSelection()}
          disabled={!session || selection.length === 0}
        >
          Clear it
        </button>
      </div>

      <div className="note">
        <strong>This button crashes app2 on purpose</strong>
        <span>
          It throws during render. Option 1 runs a single React reconciler, so the Shell's error
          boundary catches it and the rest of the Shell keeps working.
        </span>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setBoom(true)}>
          Crash app2
        </button>
      </div>
    </RemoteBoundary>
  );
}
