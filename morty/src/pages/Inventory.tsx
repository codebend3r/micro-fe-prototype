import { Link } from 'wouter';
import { findPart, type SessionState, type SessionStore } from '@mfe/shared-core';

/** Route 3 of 3. Reads the selection rick wrote. */
export function Inventory({ store, state }: { store: SessionStore; state: SessionState }) {
  const total = state.selection.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <div className="note">
        <strong>Third of three, and the one that reads what rick wrote</strong>
        <span>
          The list below is the store's selection. Rick's Garage page adds to it, world's header
          counts it, and this page reads it, all through the one plain store object world created
          and handed to each remote at mount time.
        </span>
      </div>

      {state.selection.length === 0 ? (
        <div className="empty">
          <strong>Nothing in the shared state yet</strong>
          <span className="small">
            Go to <Link href="~/rick">Rick's Garage</Link> and add something, then come back.
          </span>
        </div>
      ) : (
        <ul className="rows">
          {state.selection.map((item) => {
            const part = findPart(item.sku);
            return (
              <li className="rowitem" key={item.sku}>
                <span className="rowitem-main">
                  <span className="rowitem-name">{part?.name ?? item.sku}</span>
                  <span className="rowitem-meta">
                    {item.sku} / {part?.category ?? 'unknown'}
                  </span>
                </span>
                <span className="rowitem-state">x{item.count}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => store.removeFromSelection(item.sku)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="totals">
        <span>Items in shared state</span>
        <span className="totals-value">{total}</span>
      </div>

      {state.selection.length > 0 ? (
        <div className="row">
          <button type="button" className="btn btn-sm btn-danger" onClick={() => store.clearSelection()}>
            Clear shared state
          </button>
        </div>
      ) : null}
    </>
  );
}
