import { lazy, Suspense, type ReactNode } from 'react';
import { SessionProvider, useSession } from '@mfe/session';
import { findPart, formatMoney } from '@mfe/shared-core';
import { ProbePanel } from '@mfe/ui/probe-panel';
import { ErrorBoundary } from '@mfe/ui/chrome';
import {
  useBusEvents,
  useCompareBridge,
  useHashRoute,
  useProbeSnapshot,
  useScriptStats,
  useTelemetryUplink,
  useThemeAttribute,
} from '@mfe/ui/shell-runtime';
import { store } from './session-store';
import { Overview } from './Overview';

/**
 * The integration seam for Option 1. A remote is a lazily imported React
 * component. Nothing else. It renders inside the Shell's own component tree,
 * under the Shell's providers, inside the Shell's Suspense and error
 * boundaries, on the Shell's React instance.
 */
const InventoryApp = lazy(() => import('app1/App'));
const OrdersApp = lazy(() => import('app2/App'));

const NAV = [
  { path: '/overview', label: 'Overview' },
  { path: '/inventory', label: 'Inventory' },
  { path: '/orders', label: 'Orders' },
];

export function Shell() {
  return (
    <SessionProvider store={store}>
      <ShellChrome />
    </SessionProvider>
  );
}

function ShellChrome() {
  const session = useSession()!;
  const { state } = session;

  useThemeAttribute(state.theme, 1);
  useHashRoute(store);
  useCompareBridge(store);

  const snapshot = useProbeSnapshot();
  const scripts = useScriptStats();
  const events = useBusEvents();
  useTelemetryUplink(1, snapshot, scripts, state);

  const orderTotal = state.order.reduce(
    (sum, line) => sum + (findPart(line.sku)?.price ?? 0) * line.qty,
    0,
  );

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="brand">
          <span className="brand-mark">1</span>
          <span className="brand-text">
            <span className="brand-title">Aperture Ops</span>
            <span className="brand-sub">shared React singleton</span>
          </span>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.path}
              type="button"
              className="nav-link"
              aria-current={state.route === item.path}
              onClick={() => store.navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-side">
          <span className="chip">
            order <strong>{state.order.length}</strong> lines
            <strong>{formatMoney(orderTotal)}</strong>
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => store.setTheme(state.theme === 'dark' ? 'light' : 'dark')}
          >
            {state.theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <div className="shell-body">
        <main className="stack">
          {state.route === '/overview' ? <Overview /> : null}

          {state.route === '/inventory' ? (
            <RemoteSlot title="Inventory" remote="app1" port={5011}>
              <InventoryApp />
            </RemoteSlot>
          ) : null}

          {state.route === '/orders' ? (
            <RemoteSlot title="Orders" remote="app2" port={5012}>
              <OrdersApp />
            </RemoteSlot>
          ) : null}
        </main>

        <ProbePanel
          option={1}
          snapshot={snapshot}
          scripts={scripts}
          prod={import.meta.env.PROD}
          events={events}
        />
      </div>
    </div>
  );
}

function RemoteSlot({
  title,
  remote,
  port,
  children,
}: {
  title: string;
  remote: string;
  port: number;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <span className="eyebrow">remote</span>
          <h1>{title}</h1>
        </div>
        <span className="pill pill-accent">
          {remote} @ localhost:{port}
        </span>
      </div>

      <div className="remote-slot">
        <ErrorBoundary
          owner="Shell"
          hint="Option 1 runs one React reconciler, so the Shell's error boundary sees a render error thrown inside a remote and the rest of the Shell keeps working."
        >
          <Suspense
            fallback={<div className="loading">fetching {remote}/App over module federation</div>}
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      </div>
    </section>
  );
}
