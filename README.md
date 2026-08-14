# micro-fe-prototype

Two micro frontend integration strategies, built for real and running at the same time so they
can be compared side by side.

Both systems are the same product: a Shell (host) that owns routing, layout and session, plus two
remotes, `app1` (inventory) and `app2` (orders), each independently built and deployed and loaded
at runtime from its own `remoteEntry.js`. Both use Vite with `@module-federation/vite`
(Module Federation 2.0). No webpack anywhere.

The only thing that differs is one decision.

**Option 1, shared React singleton.** All three apps run on one React instance, declared as a
shared singleton in the federation config. Remotes expose ordinary React components that render
directly inside the Shell's component tree.

**Option 2, independent React versions.** Nothing is shared. `app1` bundles React 18, `app2`
bundles React 19, the Shell is on React 19. One React version cannot reconcile elements created by
another, so remotes expose framework agnostic `mount(el, props)` functions and the Shell hands each
one a plain DOM node to own.

---

## Requirements

- Node 20 or newer (developed on 22)
- pnpm 10 or newer (`corepack enable` is enough if you do not have it)

## Install

```bash
pnpm install
```

One install covers all eleven workspace packages. Nothing else needs installing per app.

---

## Running it

### Both options at once, which is the point of this repo

```bash
pnpm start
```

Open **http://localhost:5100**.

That builds all six apps, serves them, and starts a comparison harness that runs both complete
systems in two iframes, drives them in lockstep over `postMessage`, and collects the probe readings
each Shell streams back. Seven servers come up in total.

### Option 1 on its own

```bash
pnpm start:option1
```

Open **http://localhost:5010**.

Three servers come up: the Shell on 5010, `app1` on 5011, `app2` on 5012. The Shell fetches
`http://localhost:5011/remoteEntry.js` the first time you click Inventory, and 5012 the first time
you click Orders.

If you would rather see the three processes separately, this is the same thing in three terminals:

```bash
# terminal 1
pnpm --filter @o1/app1 build && pnpm --filter @o1/app1 preview   # :5011

# terminal 2
pnpm --filter @o1/app2 build && pnpm --filter @o1/app2 preview   # :5012

# terminal 3
pnpm --filter @o1/shell build && pnpm --filter @o1/shell preview # :5010
```

Order does not matter. The Shell only reaches for a remote when you navigate to it, so you can
start a remote after the Shell is already up.

### Option 2 on its own

```bash
pnpm start:option2
```

Open **http://localhost:5020**.

Three servers: the Shell on 5020, `app1` on 5021 (React 18), `app2` on 5022 (React 19). The
three terminal version:

```bash
# terminal 1
pnpm --filter @o2/app1 build && pnpm --filter @o2/app1 preview   # :5021, React 18

# terminal 2
pnpm --filter @o2/app2 build && pnpm --filter @o2/app2 preview   # :5022, React 19

# terminal 3
pnpm --filter @o2/shell build && pnpm --filter @o2/shell preview # :5020
```

### Running a single remote by itself

Every remote is a real standalone app, which is the whole point of independent deployment. Each one
boots its own session store and, in Option 2, drives its own `mount(el, props)` contract exactly the
way the Shell does:

```bash
pnpm --filter @o1/app1 dev    # http://localhost:5011
pnpm --filter @o2/app1 dev    # http://localhost:5021
```

### Dev mode with hot reload

```bash
pnpm dev            # all seven, harness included
pnpm dev:option1    # just Option 1's three
pnpm dev:option2    # just Option 2's three
```

Dev mode serves `remoteEntry.js` straight off each remote's Vite dev server, so there is no build
step and no watcher to babysit. Use it while editing. Use `pnpm start` when you care about the
numbers: module federation chunking and bundle sizes are only meaningful against built output, and
the probe panel labels which mode it is measuring.

### Stopping

`Ctrl+C` stops everything a script started. If a run was killed uncleanly and left servers behind:

```bash
pnpm stop
```

That frees only this prototype's ports, and only if a `node` process is holding them. It will not
touch anything else listening nearby.

### Every script

| Command | What it does |
| --- | --- |
| `pnpm start` | Build all six apps, serve them, and start the comparison harness |
| `pnpm start:option1` | Build and serve Option 1 only |
| `pnpm start:option2` | Build and serve Option 2 only |
| `pnpm dev` | All seven on Vite dev servers with HMR |
| `pnpm dev:option1` / `pnpm dev:option2` | One stack on dev servers |
| `pnpm build` | Build all six |
| `pnpm build:option1` / `pnpm build:option2` | Build one stack |
| `pnpm serve` | Serve the existing build without rebuilding |
| `pnpm stop` | Free the prototype's ports |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm clean` | Remove all `dist` folders |

### Ports

| Port | What |
| --- | --- |
| 5100 | Comparison harness |
| 5010 | Option 1 Shell |
| 5011 | Option 1 `app1`, inventory, React 19 |
| 5012 | Option 1 `app2`, orders, React 19 |
| 5020 | Option 2 Shell |
| 5021 | Option 2 `app1`, inventory, **React 18** |
| 5022 | Option 2 `app2`, orders, React 19 |

Every port is pinned with `strictPort: true`, on purpose. The Shells resolve their remotes by
absolute URL, so a remote silently landing on a different port would be worse than a failure. The
harness deliberately avoids port 5000, which macOS AirPlay Receiver occupies by default.

---

## What to look at

1. **Click "Load every remote"** in the harness toolbar. Both systems fetch all of their code and
   the live table fills in.
2. **React copies on the page.** Option 1 stays at 1. Option 2 climbs to 3. This is the single fact
   everything else follows from.
3. **React versions.** Option 2 shows `19.2.8 + 18.3.1` running in the same tab, in the same
   document, at the same time.
4. **How remotes reach shell state.** Option 1's remotes report `react context`. Option 2's remotes
   report `mount props`, and each one visibly prints `useSession() returned null`. The Option 2
   Shell renders exactly the same `<SessionProvider>` as Option 1. The remotes just cannot see it.
5. **JavaScript transferred.** Option 2 ships React three times and the number says so.
6. **Add a part in Inventory, then open Orders.** Cross app updates work in both, through different
   machinery: shared React context in Option 1, a plain store object passed at mount in Option 2.
7. **Click "Throw a render error"** inside a remote. In Option 1 the Shell's error boundary catches
   it, because there is one reconciler. In Option 2 the remote's own boundary catches it and the
   Shell never finds out, which is the fault isolation Option 2 is bought for.
8. **Switch the theme.** It works in both, because CSS custom properties cascade through the DOM
   regardless of React boundaries. Styling crosses. React state does not.

Measured with both systems fully loaded:

| | Option 1 | Option 2 |
| --- | --- | --- |
| React copies | 1 | 3 |
| React versions | 19.2.8 | 19.2.8 + 18.3.1 |
| `@mfe/session` copies | 1 | 3 |
| JavaScript transferred | 183.6 kB | 254.6 kB |
| JavaScript chunks | 40 | 22 |
| Render error caught by | the Shell's boundary | the remote's own boundary |

Option 2 sends more bytes in fewer chunks, which is the honest shape of the trade: each app bundles
its own React into one large vendor chunk, while Option 1 splits one React across many small
federated chunks.

## How the difference is measured

`packages/shared-core` carries a probe pinned to `globalThis`, so it still sees every app even when
the module itself has been duplicated. Each app registers on load with its own React namespace, and
the probe counts distinct instances by the identity of `React.createElement`, not by version string.
Two apps reporting `19.2.8` are still two copies if the function is not the same function.

Transfer sizes come from the Resource Timing API. Every app sends `Timing-Allow-Origin: *` so the
Shell can read sizes for scripts fetched from the remotes' origins.

Both Shells render the identical `ProbePanel` from `packages/ui`, so the two sides are measured by
the same code.

---

## How each option would be deployed

Nothing here is wired to a real host. This section is the theory the prototype is shaped around.

### What both options share

Every app builds to plain static assets and deploys independently to its own origin or CDN path.
The Shell resolves remotes by URL at runtime, so **a remote can redeploy without redeploying the
Shell**. That is the property that makes any of this worth the trouble.

```
https://ops.example.com/            shell
https://app1.ops.example.com/       app1  ->  /remoteEntry.js
https://app2.ops.example.com/       app2  ->  /remoteEntry.js
```

The remote URLs are hardcoded to localhost in this repo. In production they come from config, in
one of two ways.

**Build time, simplest.** The Shell reads them from the environment, which means one Shell build
per environment:

```ts
// shell/vite.config.ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [
      federation({
        name: 'shell',
        remotes: {
          app1: { type: 'module', entry: `${env.VITE_APP1_ORIGIN}/remoteEntry.js` },
          app2: { type: 'module', entry: `${env.VITE_APP2_ORIGIN}/remoteEntry.js` },
        },
      }),
    ],
  };
});
```

**Runtime, better.** The Shell ships with no remote URLs at all and registers them after fetching a
manifest at boot. One artifact promotes unchanged from staging to production, and you can move a
remote or roll one back without a Shell build:

```ts
import { registerRemotes } from '@module-federation/runtime';

const manifest = await fetch('/config/remotes.json').then((r) => r.json());
registerRemotes(
  manifest.remotes.map((r) => ({ name: r.name, entry: r.entry, type: 'module' })),
);
```

Both options can use either mechanism. It is orthogonal to the sharing decision.

### Deploying Option 1

The pipeline has to enforce a version contract, because the sharing is an implicit contract between
teams whether or not anyone wrote it down.

- **CI gate.** Before a remote publishes, check its resolved `shared` versions against the Shell's.
  `requiredVersion: '^19.0.0'` is a runtime assertion; a remote built against React 20 will fail in
  the browser, at whatever moment a user first navigates to that route. Catch it in CI, not there.
- **Upgrade path.** A React major is a coordinated release. Shell and both remotes cut over
  together, ideally behind one flag, because there is no way to run 18 and 19 at once by design.
- **Caching.** React is served once, from whichever app provides the singleton (the Shell here).
  Remote bundles must not contain React at all, which is worth asserting in CI with a bundle
  inspection step. A remote that accidentally drops `react` from its `shared` map silently doubles
  the payload and can break hooks.
- **Blast radius.** One bad remote deploy can break the entire page, because it shares a reconciler
  with everything else. Ship remotes behind a route level flag and keep rollback to a previous
  `remoteEntry.js` a one step operation.
- **Extra singletons.** In a real system the design system, the router, the query client and the
  auth provider all join React on the singleton list. Every addition is another version contract, so
  keep that list short and deliberate.

### Deploying Option 2

Each app is genuinely independent, so the pipeline gets simpler and the artifacts get bigger.

- **CI gate.** There is nothing to negotiate. The only shared contract is the shape of
  `mount(el, props)` and the store passed into it. Publish that as a small types package, or as a
  contract test that mounts the remote into a bare DOM node and asserts the unmount function tears
  it down cleanly.
- **Upgrade path.** `app1` moves to React 19 whenever its team wants, and nobody else finds out.
  This is the whole reason to pay for Option 2. It is also how you migrate a large app
  incrementally: convert one remote at a time while the rest of the system stays on the old version
  in production.
- **Caching.** Every app ships its own React, so total bytes are higher, but each app's vendor chunk
  is stable across releases. Serve them with immutable, content hashed, long lived cache headers and
  a returning user downloads the duplicated React roughly once. The cost lands on first visit.
- **Blast radius.** A remote that fails to load, or throws while rendering, takes out its own DOM
  node and nothing else. The Shell shows a fallback in place and the other remote never notices.
  That containment is what you bought.
- **Different stacks.** Because the boundary is a DOM node and a plain object, a remote can be
  rewritten in Svelte, Vue or vanilla JS without the Shell changing a line. Useful after an
  acquisition, or when one team has a good reason to be different.

### Side by side

| | Option 1 | Option 2 |
| --- | --- | --- |
| Release coupling | Coordinated across all apps for shared deps | None |
| CI must verify | Shared dependency versions across every app | The mount contract only |
| React upgrade | Flag day for the whole system | Per app, any time |
| First visit cost | Lowest, React ships once | Higher, React ships per app |
| Repeat visit cost | Low | Low, vendor chunks cache well |
| Bad remote deploy | Can break the whole page | Breaks one panel |
| Rollback unit | Remote bundle, with a version contract to re verify | Remote bundle, no coordination |
| Rewriting a remote in another framework | Not possible without changing the seam | Supported by the contract |

---

## Layout

```
scripts/          port preflight and build noise filtering
packages/
  shared-core/    framework agnostic: store, event bus, probe, catalog. No React.
  session/        the React binding. This module is the whole argument, in 40 lines.
  ui/             one stylesheet, the probe panel, remote chrome, shell hooks
compare/          the side by side harness on :5100
option1-shared/       shell, app1, app2
option2-independent/  shell, app1, app2
```

The files worth reading, in this order:

| File | Why |
| --- | --- |
| `packages/session/index.js` | Where context does or does not cross a boundary, and why |
| `option1-shared/shell/vite.config.ts` | `shared: { react: { singleton: true }, ... }` |
| `option2-independent/shell/vite.config.ts` | `shared: {}` |
| `option1-shared/shell/src/Shell.tsx` | `lazy(() => import('app1/App'))`, and that is the whole seam |
| `option2-independent/shell/src/RemoteMount.tsx` | The wrapper that drives `mount(el, props)` |
| `option2-independent/app1/src/mount.tsx` | The contract, implemented on React 18 |

---

## Troubleshooting

**`Cannot start: these ports are already taken`.** A previous run is still alive. Run `pnpm stop`.
Every script runs this check before starting anything, so you get one clear message instead of
seven processes failing at once.

**Something outside this repo holds a port.** On macOS, AirPlay Receiver listens on 5000 and 7000.
That is why the harness sits on 5100. Turn it off under System Settings > General > AirDrop &
Handoff if you need those ports back for something else.

**`... has not been built yet`.** `pnpm serve` only serves existing output. Use `pnpm start`, which
builds first.

**A remote never loads and the panel keeps spinning.** That remote's server is not running. Check
the port table above, and remember the Shell only fetches a remote when you navigate to its route,
so the failure appears on click rather than on page load.

**Build warnings you will not see.** Two harmless warnings are filtered in `scripts/vite-quiet.ts`:
`@module-federation/vite` importing `node:vm` in an SSR helper the browser build never reaches, and
Rollup reporting empty placeholder chunks for shared modules that resolve to the host's singleton.
Nothing else is suppressed.

## Notes and caveats

- The remotes import the stylesheet only in their standalone entry, not in the exposed module. Both
  options assume a shared design system loaded by the host, which keeps the JavaScript comparison
  clean. A fully independent Option 2 remote would normally ship its own CSS.
- Option 2 remotes defer `root.unmount()` by one task. Unmounting a React 18 root synchronously from
  inside the Shell's React 19 commit phase logs a warning.
- The harness talks to the Shells with `postMessage` and `'*'` as the target origin. Fine for a
  local prototype, not for production.
- `dts: false` is set on every federation config because this repo keeps a single tsconfig at the
  root rather than one per app.

## Recommendation

Start with Option 1 if all apps are owned by one org with an aligned stack. It is simpler, faster
and lighter. Choose Option 2 when the version split is the point: incremental React upgrades,
acquisitions with different stacks, or large orgs where teams must ship without coordinating
dependencies.

They are not mutually exclusive. Designing the `mount(el, props)` contract from day one, which is
Option 2's boundary, while still sharing React as a singleton, which is Option 1's performance, lets
you un share React later without rewriting the integration layer.
