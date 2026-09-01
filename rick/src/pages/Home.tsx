import { useState } from 'react';
import { CATALOG, type SessionState, type SessionStore } from '@mfe/shared-core';

/** Route 1 of 2. Writes to the store world owns. */
export function Home({ store, state }: { store: SessionStore; state: SessionState }) {
  const [boom, setBoom] = useState(false);

  if (boom) {
    throw new Error('rick threw during render, on purpose');
  }

  const countFor = (sku: string) => state.selection.find((item) => item.sku === sku)?.count ?? 0;

  return (
    <>
      <div className="note">
        <strong>The buttons below write to state world owns</strong>
        <span>
          There is no context to reach for, so each button calls a method on the plain store
          object world passed in at mount time. World re renders in its React tree, rick re renders
          in its own, and morty's Inventory page reads the result.
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
        <strong>This button crashes rick on purpose</strong>
        <span>
          It throws during render. Rick owns its own React root, so rick's own error boundary
          catches it. World and morty never find out.
        </span>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setBoom(true)}>
          Crash rick
        </button>
      </div>
    </>
  );
}
