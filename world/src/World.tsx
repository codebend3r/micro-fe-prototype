import { type ReactNode } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { SessionProvider, useSession } from '@mfe/session';
import { bus } from '@mfe/shared-core';
import { ProbePanel } from '@mfe/ui/probe-panel';
import { ErrorBoundary } from '@mfe/ui/chrome';
import {
  useBusEvents,
  useProbeSnapshot,
  useScriptStats,
  useThemeAttribute,
} from '@mfe/ui/shell-runtime';
import { store } from './session-store';
import { RemoteMount } from './RemoteMount';
import { Home } from './Home';

// Stable references. A new loader identity would remount the remote. Each
// import is a federated module that is only fetched when the loader runs.
const loadRick = () => import('rick/mount');
const loadMorty = () => import('morty/mount');
const loadJerry = () => import('jerry/mount');

/**
 * Everything a remote gets, handed over once at mount time. It has to be
 * framework agnostic: plain objects and functions any React root, or a Svelte
 * component, could use. `base` tells the remote's own wouter which prefix of
 * the browser URL belongs to it.
 */
const shared = { store, bus };
const rickProps = { ...shared, base: '/rick' };
const mortyProps = { ...shared, base: '/morty' };
const jerryProps = { ...shared, base: '/jerry' };

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/rick', label: 'Rick' },
  { href: '/morty', label: 'Morty' },
  { href: '/jerry', label: 'Jerry' },
];

export function World() {
  return (
    // The provider is only for world's own tree. The remotes cannot see it,
    // because each of them created its own SessionContext with its own React.
    <SessionProvider store={store}>
      <WorldChrome />
    </SessionProvider>
  );
}

function isActive(href: string, location: string) {
  return href === '/' ? location === '/' : location === href || location.startsWith(`${href}/`);
}

function WorldChrome() {
  const { state } = useSession()!;
  const [location] = useLocation();

  useThemeAttribute(state.theme);

  const snapshot = useProbeSnapshot();
  const scripts = useScriptStats();
  const events = useBusEvents();

  const selected = state.selection.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="brand">
          <span className="brand-mark">W</span>
          <span className="brand-text">
            <span className="brand-title">world</span>
            <span className="brand-sub">shell, React 19 + wouter</span>
          </span>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={isActive(item.href, location)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-side">
          <span className="chip" title="State world owns, written by rick and read by morty">
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
          <Switch>
            <Route path="/" component={Home} />

            {/*
              `nest` makes the route match /rick and everything under it. The
              remote's own wouter takes it from there, so world never needs to
              know that rick has a /lab page.
            */}
            <Route path="/rick" nest>
              <RemoteSlot title="Rick" remote="rick" address={__REMOTE_RICK__} routes={2}>
                <RemoteMount name="rick" loader={loadRick} props={rickProps} />
              </RemoteSlot>
            </Route>

            <Route path="/morty" nest>
              <RemoteSlot title="Morty" remote="morty" address={__REMOTE_MORTY__} routes={3}>
                <RemoteMount name="morty" loader={loadMorty} props={mortyProps} />
              </RemoteSlot>
            </Route>

            {/*
              Jerry is built, served and versioned in another repository. World
              treats it exactly like the two remotes it grew up with: a URL to
              a remoteEntry.js, a prefix, and the same props bag.
            */}
            <Route path="/jerry" nest>
              <RemoteSlot title="Jerry" remote="jerry" address={__REMOTE_JERRY__} routes={4} guest>
                <RemoteMount name="jerry" loader={loadJerry} props={jerryProps} />
              </RemoteSlot>
            </Route>

            <Route>
              <section className="panel">
                <div className="panel-title">
                  <span className="eyebrow">world</span>
                  <h1>Nothing lives at {location}</h1>
                </div>
                <p className="muted">
                  World only knows four prefixes. <Link href="/">Back to the start.</Link>
                </p>
              </section>
            </Route>
          </Switch>
        </main>

        <ProbePanel
          snapshot={snapshot}
          scripts={scripts}
          prod={import.meta.env.PROD}
          events={events}
          location={location}
        />
      </div>
    </div>
  );
}

function RemoteSlot({
  title,
  remote,
  address,
  routes,
  guest = false,
  children,
}: {
  title: string;
  remote: string;
  address: AppAddress;
  routes: number;
  /** True for a remote that lives in a different repository. */
  guest?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <span className="eyebrow">
            {guest ? 'guest ' : ''}remote {remote}, {routes} routes of its own
            {guest ? ', from another repo' : ''}
          </span>
          <h1>{title}</h1>
        </div>
        <span className="pill pill-accent">
          {remote} @ {address.label}
        </span>
      </div>

      <div className="remote-slot">
        {/*
          This boundary is real but it will never fire for a render error
          thrown inside the remote. That error happens in a different React
          root, so the remote's own boundary catches it instead.
        */}
        <ErrorBoundary
          owner="world"
          hint="If you are reading this, the failure happened in world's own tree rather than inside the remote."
        >
          {children}
        </ErrorBoundary>
      </div>
    </section>
  );
}
