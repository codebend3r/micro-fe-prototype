/**
 * Morty's app. Three routes, all relative to whatever base world hands over,
 * so `/school` here is `/morty/school` in the browser when mounted inside
 * world and `/school` when running standalone.
 *
 * There is no `useSession()` here that works. Morty has its own copy of
 * @mfe/session and its own React, so world's provider is invisible. The store
 * arrives as an ordinary prop instead.
 */
import { useEffect } from 'react';
import { Link, Route, Router, Switch, useLocation, useRoute } from 'wouter';
import { useStoreState } from '@mfe/session';
import { updateApp, type AppRecord, type Bus, type SessionStore } from '@mfe/shared-core';
import { RemoteBoundary } from '@mfe/ui/chrome';
import { Home } from './pages/Home';
import { School } from './pages/School';
import { Inventory } from './pages/Inventory';

export type RemoteProps = {
  store: SessionStore;
  bus: Bus;
  base: string;
};

export default function App({ store, bus, base, identity }: RemoteProps & { identity: AppRecord }) {
  return (
    // Morty's own wouter. It reads the same window.location as world's, and
    // `base` tells it which prefix is world's business.
    <Router base={base}>
      <RemoteBoundary app="morty" version={identity.reactVersion} instanceId={identity.reactId}>
        <Pages store={store} bus={bus} />
      </RemoteBoundary>
    </Router>
  );
}

function Pages({ store, bus }: { store: SessionStore; bus: Bus }) {
  const state = useStoreState(store);
  // Relative to the base, so this reads "/school" not "/morty/school".
  const [location] = useLocation();

  useEffect(() => {
    updateApp('morty', { location, themeSeen: state.theme });
  }, [location, state.theme]);

  return (
    <>
      <nav className="nav">
        <NavLink href="/">Home</NavLink>
        <NavLink href="/school">School</NavLink>
        <NavLink href="/inventory">Inventory</NavLink>
        <span className="pill">morty sees {location}</span>
        <span className="pill">theme seen: {state.theme}</span>
      </nav>

      <Switch>
        <Route path="/" component={Home} />
        <Route path="/school">
          <School bus={bus} />
        </Route>
        <Route path="/inventory">
          <Inventory store={store} state={state} />
        </Route>
        <Route>
          <div className="empty">
            <strong>morty has no page at {location}</strong>
            <span className="small">Only /, /school and /inventory exist here.</span>
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
