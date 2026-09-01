/**
 * Rick's app. Two routes, both relative to whatever base world hands over,
 * so `/lab` here is `/rick/lab` in the browser when mounted inside world and
 * `/lab` when running standalone.
 *
 * There is no `useSession()` here that works. Rick has its own copy of
 * @mfe/session and its own React, so world's provider is invisible. The store
 * arrives as an ordinary prop instead.
 */
import { useEffect } from 'react';
import { Link, Route, Router, Switch, useLocation, useRoute } from 'wouter';
import { useStoreState } from '@mfe/session';
import { updateApp, type AppRecord, type Bus, type SessionStore } from '@mfe/shared-core';
import { RemoteBoundary } from '@mfe/ui/chrome';
import { Home } from './pages/Home';
import { Lab } from './pages/Lab';

export type RemoteProps = {
  store: SessionStore;
  bus: Bus;
  base: string;
};

export default function App({ store, base, identity }: RemoteProps & { identity: AppRecord }) {
  return (
    // Rick's own wouter. It reads the same window.location as world's, and
    // `base` tells it which prefix is world's business.
    <Router base={base}>
      <RemoteBoundary app="rick" version={identity.reactVersion} instanceId={identity.reactId}>
        <Pages store={store} />
      </RemoteBoundary>
    </Router>
  );
}

function Pages({ store }: { store: SessionStore }) {
  const state = useStoreState(store);
  // Relative to the base, so this reads "/lab" not "/rick/lab".
  const [location] = useLocation();

  useEffect(() => {
    updateApp('rick', { location, themeSeen: state.theme });
  }, [location, state.theme]);

  return (
    <>
      <nav className="nav">
        <NavLink href="/">Garage</NavLink>
        <NavLink href="/lab">Lab</NavLink>
        <span className="pill">rick sees {location}</span>
        <span className="pill">theme seen: {state.theme}</span>
      </nav>

      <Switch>
        <Route path="/">
          <Home store={store} state={state} />
        </Route>
        <Route path="/lab" component={Lab} />
        <Route>
          <div className="empty">
            <strong>rick has no page at {location}</strong>
            <span className="small">Only / and /lab exist here.</span>
          </div>
        </Route>
      </Switch>
    </>
  );
}

function NavLink({ href, children }: { href: string; children: string }) {
  const [active] = useRoute(href);
  return (
    <Link href={href} className="nav-link" aria-current={active}>
      {children}
    </Link>
  );
}
