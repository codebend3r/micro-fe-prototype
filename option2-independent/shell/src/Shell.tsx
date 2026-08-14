import { type ReactNode } from 'react';
import { SessionProvider, useSession } from '@mfe/session';
import { bus } from '@mfe/shared-core';
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
import { RemoteMount } from './RemoteMount';
import { Overview } from './Overview';

// Stable references. A new loader identity would remount the remote.
const loadApp1 = () => import('app1/mount');
const loadApp2 = () => import('app2/mount');

/**
 * Everything a remote gets, handed over once at mount time. It has to be
 * framework agnostic: plain objects and functions that a React 18 tree, a
 * React 19 tree, or a Svelte component could all use.
 */
const mountProps = { store, bus, host: 'shell' };

const NAV = [
  { path: '/overview', label: 'Overview' },
  { path: '/catalog', label: 'Catalog (app1)' },
  { path: '/selection', label: 'Selection (app2)' },
];

export function Shell() {
  return (
    // The provider is here, exactly as in Option 1. The remotes still cannot
    // see it, because each of them created its own SessionContext object with
    // its own React.
    <SessionProvider store={store}>
      <ShellChrome />
    </SessionProvider>
  );
}

function ShellChrome() {
  const session = useSession()!;
  const { state } = session;

  useThemeAttribute(state.theme, 2);
  useHashRoute(store);
  useCompareBridge(store);

  const snapshot = useProbeSnapshot();
  const scripts = useScriptStats();
  const events = useBusEvents();
  useTelemetryUplink(2, snapshot, scripts, state);

  const selected = state.selection.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="brand">
          <span className="brand-mark">2</span>
          <span className="brand-text">
            <span className="brand-title">Aperture Ops</span>
            <span className="brand-sub">independent React versions</span>
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
              port={5021}
              react="18"
            >
              <RemoteMount name="app1" loader={loadApp1} props={mountProps} />
            </RemoteSlot>
          ) : null}

          {state.route === '/selection' ? (
            <RemoteSlot
              title="Selection"
              role="reads the shared state"
              remote="app2"
              port={5022}
              react="19"
            >
              <RemoteMount name="app2" loader={loadApp2} props={mountProps} />
            </RemoteSlot>
          ) : null}
        </main>

        <ProbePanel
          option={2}
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
  port,
  react,
  children,
}: {
  title: string;
  role: string;
  remote: string;
  port: number;
  react: string;
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
          {remote} @ localhost:{port}, React {react}
        </span>
      </div>

      <div className="remote-slot">
        {/*
          This boundary is real but it will never fire for a render error
          thrown inside the remote. That error happens in a different React
          root, so the remote's own boundary catches it instead.
        */}
        <ErrorBoundary
          owner="Shell"
          hint="If you are reading this, the failure happened in the Shell's own tree rather than inside the remote."
        >
          {children}
        </ErrorBoundary>
      </div>
    </section>
  );
}
