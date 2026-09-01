import { Link } from 'wouter';
import { useSession } from '@mfe/session';
import { Code } from '@mfe/ui/chrome';

// The entries are interpolated rather than typed out, so the sample stays true
// whether this build points at localhost or at a deployed path.
const WORLD_CONFIG = `federation({
  name: 'world',
  remotes: {
    rick:  { type: 'module', entry: '${__REMOTE_RICK__.url}remoteEntry.js' },
    morty: { type: 'module', entry: '${__REMOTE_MORTY__.url}remoteEntry.js' },
  },
  // Nothing shared. Each app ships its own React 19 and its own wouter.
  shared: {},
})`;

const WORLD_ROUTES = `// world/src/World.tsx
<Switch>
  <Route path="/" component={Home} />
  <Route path="/rick" nest>
    <RemoteMount loader={() => import('rick/mount')} props={{ ...shared, base: '/rick' }} />
  </Route>
  <Route path="/morty" nest>
    <RemoteMount loader={() => import('morty/mount')} props={{ ...shared, base: '/morty' }} />
  </Route>
</Switch>`;

const MOUNT_CONTRACT = `// rick/src/mount.tsx, exposed as './mount'
export function mount(el, { store, bus, base }) {
  const root = createRoot(el);            // rick's own React 19
  root.render(
    <Router base={base}>                  // rick's own wouter, same window.location
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/lab" component={Lab} />
      </Switch>
    </Router>,
  );
  return () => root.unmount();
}`;

export function Home() {
  const { state } = useSession()!;

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <span className="eyebrow">world</span>
            <h1>One shell, two lazily loaded remotes</h1>
          </div>
          <span className="pill pill-accent">integration unit: mount(el, props)</span>
        </div>

        <p className="muted">
          World owns the page: layout, the session store, and the browser URL. Rick and Morty are
          built and served on their own, and world fetches each one over module federation the
          first time its route matches. Every app bundles its own React 19 and its own wouter, so
          the boundary between them is a DOM node and a bag of plain props, not a React component.
        </p>

        <div className="note">
          <strong>Try the routes</strong>
          <span>
            Open <Link href="/rick">Rick</Link>, click into his second page, then open{' '}
            <Link href="/morty">Morty</Link> and walk his three. Now use the browser back button.
            Every step you took is a history entry, including the ones that happened inside a
            remote, because all three wouters read the same <span className="mono">window.location</span>.
            Watch the probe on the right: each remote's JavaScript only arrives when you first visit it.
          </span>
        </div>

        <dl className="kv">
          <dt>Signed in</dt>
          <dd>
            {state.user.name}, {state.user.role}
          </dd>
          <dt>Theme</dt>
          <dd>{state.theme}</dd>
          <dt>Shared items</dt>
          <dd>{state.selection.length}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-title">
          <span className="eyebrow">World</span>
          <h2>vite.config.ts</h2>
        </div>
        <Code>{WORLD_CONFIG}</Code>

        <div className="panel-title">
          <span className="eyebrow">World</span>
          <h2>Routing: a nested route per remote</h2>
        </div>
        <Code>{WORLD_ROUTES}</Code>

        <div className="panel-title">
          <span className="eyebrow">Remote</span>
          <h2>The mount contract</h2>
        </div>
        <Code>{MOUNT_CONTRACT}</Code>
      </section>
    </>
  );
}
