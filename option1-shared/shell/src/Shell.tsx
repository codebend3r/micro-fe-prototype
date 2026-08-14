import { lazy, Suspense, type ReactNode } from 'react';
import { SessionProvider, useSession } from '@mfe/session';
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
const CatalogApp = lazy(() => import('app1/App'));
const SelectionApp = lazy(() => import('app2/App'));

const NAV = [
  { path: '/overview', label: 'Overview' },
  { path: '/catalog', label: 'Catalog (app1)' },
  { path: '/selection', label: 'Selection (app2)' },
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

  const selected = state.selection.reduce((sum, item) => sum + item.count, 0);

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
          <span className="chip" title="State the Shell owns, written by app1 and read by app2">
            shared state <strong>{selected}</strong> item{selected === 1 ? '' : 's'}
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

          {state.route === '/catalog' ? (
            <RemoteSlot
              title="Catalog"
              role="writes the shared state"
              remote="app1"
              address={__REMOTE_APP1__}
            >
              <CatalogApp />
            </RemoteSlot>
          ) : null}

          {state.route === '/selection' ? (
            <RemoteSlot
              title="Selection"
              role="reads the shared state"
              remote="app2"
              address={__REMOTE_APP2__}
            >
              <SelectionApp />
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
  role,
  remote,
  address,
  children,
}: {
  title: string;
  role: string;
  remote: string;
  address: AppAddress;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <span className="eyebrow">remote {remote}, {role}</span>
          <h1>{title}</h1>
        </div>
        <span className="pill pill-accent">
          {remote} @ {address.label}
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
