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
  // Nothing shared. app1 ships React 18, app2 ships React 19,
  // and neither has to ask the other for permission to upgrade.
  shared: {},
})`;

const MOUNT_CONTRACT = `// app1/src/mount.tsx, exposed as './mount'
import { createRoot } from 'react-dom/client'; // app1's own React 18
import App from './App';

export function mount(el: HTMLElement, props: Record<string, unknown>) {
  const root = createRoot(el);
  root.render(<App {...props} />);
  return () => root.unmount();
}`;

const SHELL_USAGE = `// shell/src/RemoteMount.tsx
useEffect(() => {
  let unmount;
  loader().then(({ mount }) => {
    unmount = mount(host.current, props);
  });
  return () => unmount?.();
}, [loader]);

return <div ref={host} />;`;

export function Overview() {
  const { state } = useSession()!;

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <span className="eyebrow">Option 2</span>
            <h1>Independent React versions</h1>
          </div>
          <span className="pill pill-accent">integration unit: mount(el, props)</span>
        </div>

        <p className="muted">
          Each app bundles its own copy of React. app1 is on React 18, app2 is on React 19, and the
          Shell is on React 19. One React version cannot reconcile elements created by another, so
          the remotes expose framework agnostic mount functions and the Shell hands each one a plain
          DOM node to own.
        </p>

        <div className="note">
          <strong>What to watch in the probe</strong>
          <span>
            React copies climbs to 3 as you visit both remotes, the versions column shows 18 and 19
            living together, both remotes report <span className="mono">mount props</span> rather
            than context, and the JavaScript total is visibly larger than Option 1.
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
          <span className="eyebrow">Remote</span>
          <h2>The mount contract</h2>
        </div>
        <Code>{MOUNT_CONTRACT}</Code>

        <div className="panel-title">
          <span className="eyebrow">Shell</span>
          <h2>The wrapper that drives it</h2>
        </div>
        <Code>{SHELL_USAGE}</Code>
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
              <td>Each team upgrades React on its own schedule</td>
              <td>Every app ships its own React copy, so the total bundle is larger</td>
            </tr>
            <tr>
              <td>React 18 and 19 run side by side, so migration can be incremental</td>
              <td>No shared context, hooks or Suspense coordination across the boundary</td>
            </tr>
            <tr>
              <td>A dependency conflict in one app cannot break another</td>
              <td>Providers such as theme, auth and query client are recreated per app</td>
            </tr>
            <tr>
              <td>The boundary is framework agnostic, a remote could later be Svelte</td>
              <td>More boilerplate: mount contracts, wrappers, and an explicit store or bus</td>
            </tr>
            <tr>
              <td>No singleton version mismatch failures at runtime</td>
              <td>Several reconcilers running, so slightly more memory and CPU</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
