# micro-fe-prototype

Two micro frontend integration strategies, built for real and running at the same time so they
can be compared side by side.

**Live: [micro-fe-prototype.netlify.app](https://micro-fe-prototype.netlify.app)**

Both systems are the same product: a Shell (host) that owns routing, layout and session, plus two
remotes: `app1` (Catalog, which writes shared state) and `app2` (Selection, which reads it). Each
remote is independently built and deployed, and loaded at runtime from its own `remoteEntry.js`.
Both use Vite with `@module-federation/vite` (Module Federation 2.0). No webpack anywhere.

The demo content is placeholder data. Nothing is priced, sold, or sent anywhere. The `selection`
list exists only to be a value that visibly crosses an app boundary, so the two options can be
caught doing it differently.

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

- Bun 1.2 or newer (developed on 1.3), used as both the package manager and the script runner
- Node 20 or newer (developed on 22). Vite's binary carries a `#!/usr/bin/env node` shebang and
  `bun run` honours it, so Node is still the runtime that builds and serves the apps. Bun drives
  everything above that.

### Installing Bun

Pick whichever line matches your machine:

```bash
# macOS, Linux, WSL
curl -fsSL https://bun.sh/install | bash

# macOS, via Homebrew
brew install oven-sh/bun/bun

# any platform, if you already have Node
npm install -g bun

# Windows, in PowerShell
powershell -c "irm bun.sh/install.ps1 | iex"
```

The shell installer drops Bun in `~/.bun/bin` and appends that to your `PATH`, so open a new
terminal afterwards. Confirm it took:

```bash
bun --version    # 1.2.0 or newer
```

Already have Bun but it is old? `bun upgrade`.

## Install

```bash
bun install
```

One install covers all eleven workspace packages. Nothing else needs installing per app.

Bun reads the workspace list from the `workspaces` field in the root `package.json` and links the
`@mfe/*` packages from source, so edits to `packages/` are picked up without a rebuild. It installs
with the isolated linker, which matters here: Option 2's `app1` genuinely gets React 18 while
everything else gets React 19, rather than one hoisted copy winning. `esbuild` is listed under
`trustedDependencies` so its postinstall can fetch the platform binary Vite needs.

---

## Running it

### Both options at once, which is the point of this repo

```bash
bun run start
```

Open **http://localhost:5100**.

That builds all six apps, serves them, and starts a comparison harness that runs both complete
systems in two iframes, drives them in lockstep over `postMessage`, and collects the probe readings
each Shell streams back. Seven servers come up in total.

### Option 1 on its own

```bash
bun run start:option1
```

Open **http://localhost:5010**.

Three servers come up: the Shell on 5010, `app1` on 5011, `app2` on 5012. The Shell fetches
`http://localhost:5011/remoteEntry.js` the first time you click Catalog, and 5012 the first time
you click Selection.

If you would rather see the three processes separately, this is the same thing in three terminals:

```bash
# terminal 1
bun run --filter @o1/app1 build && bun run --filter @o1/app1 preview   # :5011

# terminal 2
bun run --filter @o1/app2 build && bun run --filter @o1/app2 preview   # :5012

# terminal 3
bun run --filter @o1/shell build && bun run --filter @o1/shell preview # :5010
```

Order does not matter. The Shell only reaches for a remote when you navigate to it, so you can
start a remote after the Shell is already up.

### Option 2 on its own

```bash
bun run start:option2
```

Open **http://localhost:5020**.

Three servers: the Shell on 5020, `app1` on 5021 (React 18), `app2` on 5022 (React 19). The
three terminal version:

```bash
# terminal 1
bun run --filter @o2/app1 build && bun run --filter @o2/app1 preview   # :5021, React 18

# terminal 2
bun run --filter @o2/app2 build && bun run --filter @o2/app2 preview   # :5022, React 19

# terminal 3
bun run --filter @o2/shell build && bun run --filter @o2/shell preview # :5020
```

### Running a single remote by itself

Every remote is a real standalone app, which is the whole point of independent deployment. Each one
boots its own session store and, in Option 2, drives its own `mount(el, props)` contract exactly the
way the Shell does:

```bash
bun run --filter @o1/app1 dev    # http://localhost:5011
bun run --filter @o2/app1 dev    # http://localhost:5021
```

### Dev mode with hot reload

```bash
bun run dev            # all seven, harness included
bun run dev:option1    # just Option 1's three
bun run dev:option2    # just Option 2's three
```

Dev mode serves `remoteEntry.js` straight off each remote's Vite dev server, so there is no build
step and no watcher to babysit. Use it while editing. Use `bun run start` when you care about the
numbers: module federation chunking and bundle sizes are only meaningful against built output, and
the probe panel labels which mode it is measuring.

### Stopping

`Ctrl+C` stops everything a script started. If a run was killed uncleanly and left servers behind:

```bash
bun run stop
```

That frees only this prototype's ports, and only if a `node` or `bun` process is holding them. It
will not touch anything else listening nearby.

### Every script

| Command | What it does |
| --- | --- |
| `bun run start` | Build all six apps, serve them, and start the comparison harness |
| `bun run start:option1` | Build and serve Option 1 only |
| `bun run start:option2` | Build and serve Option 2 only |
| `bun run dev` | All seven on Vite dev servers with HMR |
| `bun run dev:option1` / `bun run dev:option2` | One stack on dev servers |
| `bun run build` | Build all six |
| `bun run build:option1` / `bun run build:option2` | Build one stack |
| `bun run build:netlify` | Build all seven for one origin and assemble `dist/` |
| `bun run serve` | Serve the existing build without rebuilding |
| `bun run stop` | Free the prototype's ports |
| `bun run typecheck` | `tsc --noEmit` across the workspace |
| `bun run clean` | Remove all `dist` folders |

### Ports

| Port | What |
| --- | --- |
| 5100 | Comparison harness |
| 5010 | Option 1 Shell |
| 5011 | Option 1 `app1`, Catalog, React 19 |
| 5012 | Option 1 `app2`, Selection, React 19 |
| 5020 | Option 2 Shell |
| 5021 | Option 2 `app1`, Catalog, **React 18** |
| 5022 | Option 2 `app2`, Selection, React 19 |

Every port is pinned with `strictPort: true`, on purpose. The Shells resolve their remotes by
absolute URL, so a remote silently landing on a different port would be worse than a failure. The
harness deliberately avoids port 5000, which macOS AirPlay Receiver occupies by default.

---

## The deployed copy

**[micro-fe-prototype.netlify.app](https://micro-fe-prototype.netlify.app)** runs the same seven
apps, built the same way, on Netlify.

Locally the seven apps are seven origins. A static host hands out one, so the deployed build gives
each app its own path prefix on that single origin instead:

| Path | What |
| --- | --- |
| `/` | Comparison harness |
| `/option1/shell/` | Option 1 Shell |
| `/option1/app1/` | Option 1 `app1`, React 19, serves `remoteEntry.js` |
| `/option1/app2/` | Option 1 `app2`, React 19 |
| `/option2/shell/` | Option 2 Shell |
| `/option2/app1/` | Option 2 `app1`, **React 18** |
| `/option2/app2/` | Option 2 `app2`, React 19 |

`/option1` and `/option2` redirect to their Shells, for typing by hand.

Nothing about the architecture changes. Each app is still built entirely on its own, the Shells
still fetch `remoteEntry.js` at runtime and still resolve remotes by URL, and a remote can still be
rebuilt and redeployed without the Shell being rebuilt. Only the addresses are different, and only
because the host offers one origin rather than seven.

`scripts/deploy-target.ts` is the single place those addresses are decided. Every vite config reads
its `base` and its remote entries from it, and the two Shells and the harness get the addresses they
print on screen injected from it at build time, so nothing has a port number typed into it. Set
`MFE_TARGET=netlify` and the whole workspace builds for paths; leave it unset and it builds for
localhost. `scripts/assemble-dist.mjs` then stacks the seven `dist` folders into one publishable
`dist/`, and `netlify.toml` publishes it.

```bash
bun run build:netlify    # MFE_TARGET=netlify, build all seven, assemble dist/
```

Two things the single origin changes, both cosmetic:

- The probe's "JavaScript by origin" table collapses to one row. Locally it is one row per port,
  which is a nicer illustration of where the bytes came from.
- `Timing-Allow-Origin` stops mattering. Deployed, every script is same origin, so the browser
  reports transfer sizes without being asked. The headers are still sent, because locally they are
  the only reason the numbers exist at all.

Both Shells route on the URL hash, so every path above is a real file on disk and the deploy needs
no SPA fallback rule.

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
6. **Click "Add to shared state" on the Catalog tab, then open Selection.** Cross app updates work
   in both, through different machinery: shared React context in Option 1, a plain store object
   handed over at mount time in Option 2.
7. **Click "Crash app1" or "Crash app2"** inside a remote. In Option 1 the Shell's error boundary catches
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
Shell can read sizes for scripts fetched from the remotes' origins. On the deployed copy there is
only one origin, so the browser reports them regardless.

Both Shells render the identical `ProbePanel` from `packages/ui`, so the two sides are measured by
the same code.

---

## How each option would be deployed for real

The Netlify deploy above is one origin and one pipeline, which is the convenient shape for a
prototype and the wrong shape for the thing it is a prototype of. This section is the theory the
prototype is shaped around: what changes when each app belongs to a different team.

### What both options share

Every app builds to plain static assets and deploys independently to its own origin or CDN path.
The Shell resolves remotes by URL at runtime, so **a remote can redeploy without redeploying the
Shell**. That is the property that makes any of this worth the trouble.

```
https://ops.example.com/            shell
https://app1.ops.example.com/       app1  ->  /remoteEntry.js
https://app2.ops.example.com/       app2  ->  /remoteEntry.js
```

The remote URLs come from config, in one of two ways.

**Build time, simplest.** The Shell reads them from the environment, which means one Shell build
per environment. This repo already does exactly this, with `MFE_TARGET` selecting an address book
in `scripts/deploy-target.ts`. A real system would read the origins themselves rather than pick a
preset:

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
scripts/          where every app lives, port preflight, deploy assembly, build noise filtering
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
| `scripts/deploy-target.ts` | The one place any app's address is written down |

---

## Troubleshooting

**`Cannot start: these ports are already taken`.** A previous run is still alive. Run
`bun run stop`. Every script runs this check before starting anything, so you get one clear message
instead of seven processes failing at once.

**Something outside this repo holds a port.** On macOS, AirPlay Receiver listens on 5000 and 7000.
That is why the harness sits on 5100. Turn it off under System Settings > General > AirDrop &
Handoff if you need those ports back for something else.

**`... has not been built yet`.** `bun run serve` only serves existing output. Use `bun run start`,
which builds first.

**Say `bun run build`, not `bun build`.** `build`, `test`, `install`, `link` and `x` are Bun's own
subcommands, so `bun build` fires Bun's bundler instead of this repo's build script. The `bun run`
prefix is spelled out everywhere above for that reason, and it is always safe.

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
