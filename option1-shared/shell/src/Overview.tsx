import { useSession } from '@mfe/session';
import { Code } from '@mfe/ui/chrome';

// The entries are interpolated rather than typed out, so the sample stays true
// whether this build points at localhost or at a deployed path.
const SHELL_CONFIG = `federation({
  name: 'shell',
  remotes: {
    app1: { type: 'module', entry: '${__REMOTE_APP1__.url}remoteEntry.js' },
    app2: { type: 'module', entry: '${__REMOTE_APP2__.url}remoteEntry.js' },
  },
  shared: {
    react:            { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom':      { singleton: true, requiredVersion: '^19.0.0' },
    '@mfe/session':   { singleton: true },
    '@mfe/shared-core': { singleton: true },
  },
})`;

const SHELL_USAGE = `// The remote is just a component.
const CatalogApp = lazy(() => import('app1/App'));

<ErrorBoundary owner="Shell">
  <Suspense fallback={<Spinner />}>
    <CatalogApp />
  </Suspense>
</ErrorBoundary>`;

const REMOTE_USAGE = `// app1/src/App.tsx, exposed as './App'
export default function App() {
  // Reaches the Shell's provider. No props, no wiring.
  const { state, store } = useSession();
  return <Catalog items={state.selection} onAdd={store.addToSelection} />;
}`;

export function Overview() {
  const { state } = useSession()!;

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <span className="eyebrow">Option 1</span>
            <h1>Shared React singleton</h1>
          </div>
          <span className="pill pill-accent">integration unit: React component</span>
        </div>

        <p className="muted">
          All three apps run on one React instance, declared as a shared singleton in the
          federation config. React is loaded once, provided by whichever app boots first, and the
          remotes expose ordinary React components that render directly inside the Shell's own
          component tree.
        </p>

        <div className="note">
          <strong>What to watch in the probe</strong>
          <span>
            React copies stays at 1 no matter how many remotes you visit, both remotes report{' '}
            <span className="mono">context</span> for the shell session, and the total JavaScript
            stays small because React ships once for the entire system.
          </span>
        </div>

        <dl className="kv">
          <dt>Signed in</dt>
          <dd>
            {state.user.name}, {state.user.role}
          </dd>
          <dt>Theme</dt>
          <dd>{state.theme}</dd>
          <dt>Route</dt>
          <dd>{state.route}</dd>
          <dt>Shared items</dt>
          <dd>{state.selection.length}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-title">
          <span className="eyebrow">Shell</span>
          <h2>vite.config.ts</h2>
        </div>
        <Code>{SHELL_CONFIG}</Code>

        <div className="panel-title">
          <span className="eyebrow">Shell</span>
          <h2>Mounting a remote</h2>
        </div>
        <Code>{SHELL_USAGE}</Code>

        <div className="panel-title">
          <span className="eyebrow">Remote</span>
          <h2>Reading shell state</h2>
        </div>
        <Code>{REMOTE_USAGE}</Code>
      </section>

      <section className="panel">
        <div className="panel-title">
          <span className="eyebrow">Trade off</span>
          <h2>What you are buying and paying for</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Buying</th>
              <th>Paying</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>React ships once, smallest total bundle</td>
              <td>Every app is pinned to the same React version</td>
            </tr>
            <tr>
              <td>Context, hooks, Suspense and error boundaries work across apps</td>
              <td>A breaking React upgrade forces every team to move at once</td>
            </tr>
            <tr>
              <td>Remotes feel like lazily loaded components, so almost no boilerplate</td>
              <td>Shared deps become an implicit contract between teams</td>
            </tr>
            <tr>
              <td>One reconciler and one scheduler, best runtime performance</td>
              <td>A singleton version mismatch fails at runtime and is hard to debug</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
