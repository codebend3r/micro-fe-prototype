# micro-fe-prototype

A micro frontend, built for real: a shell called **world** that lazy loads two remotes, **rick**
and **morty**, over module federation. Every app is on React 19 and routes with wouter.

**Live: [micro-fe-prototype.netlify.app](https://micro-fe-prototype.netlify.app)**

World owns the page: layout, the session store, and the browser URL. Rick and morty are each
independently built and served, and world fetches a remote's code the first time its route
matches. Nothing is federated as shared. Each app bundles its own React 19 and its own wouter, so
the boundary between world and a remote is a DOM node and a bag of plain props, not a React
component. Remotes expose a framework agnostic `mount(el, props)` function and world hands each one
an empty div to own.

All three use Vite with `@module-federation/vite` (Module Federation 2.0). No webpack anywhere.

The demo content is placeholder data. Nothing is priced, sold, or sent anywhere. The `selection`
list exists only to be a value that visibly crosses an app boundary.

---

## The three apps

| App | Role | Routes | Port |
| --- | --- | --- | --- |
| `world` | shell: routing, layout, session | `/`, `/rick/*`, `/morty/*` | 5100 |
| `rick` | remote, writes the shared state | `/`, `/lab` | 5101 |
| `morty` | remote, reads the shared state | `/`, `/school`, `/inventory` | 5102 |

A remote's routes are relative. Mounted inside world, rick's `/lab` is `/rick/lab` in the browser.
Running standalone on its own port, it is just `/lab`.

## Requirements

- Bun 1.2 or newer (developed on 1.4), used as both the package manager and the script runner
- Node 20 or newer (developed on 26). Vite's binary carries a `#!/usr/bin/env node` shebang and
  `bun run` honours it, so Node is still the runtime that builds and serves the apps. Bun drives
  everything above that.

### Installing Bun

```bash
# macOS, Linux, WSL
curl -fsSL https://bun.sh/install | bash

# macOS, via Homebrew
brew install oven-sh/bun/bun

# any platform, if you already have Node
npm install -g bun
```

The shell installer drops Bun in `~/.bun/bin` and appends that to your `PATH`, so open a new
terminal afterwards. Confirm it took with `bun --version`. Already have Bun but it is old?
`bun upgrade`.

## Install

```bash
bun install
```

One install covers all six workspace packages: the three apps and the three `@mfe/*` packages
under `packages/`, which Bun links from source so edits are picked up without a rebuild.

---

## Running it

```bash
bun run start
```

Open **http://localhost:5100**.

That builds all three apps and serves them: world on 5100, rick on 5101, morty on 5102. World
fetches `http://localhost:5101/remoteEntry.js` at boot to learn what rick offers, and rick's actual
code the first time you click Rick. Same for morty.

If you would rather see the three processes separately, this is the same thing in three terminals:

```bash
bun run --filter @app/rick build && bun run --filter @app/rick preview     # :5101
bun run --filter @app/morty build && bun run --filter @app/morty preview   # :5102
bun run --filter @app/world build && bun run --filter @app/world preview   # :5100
```

Order does not matter. World only reaches for a remote's code when you navigate to it, so you can
start a remote after world is already up. If a remote is down when you navigate to it, world shows
a failure inside that remote's slot and the rest of the page keeps working.

### Running a remote by itself

Every remote is a real standalone app, which is the whole point of independent deployment. Each one
boots its own session store and drives its own `mount(el, props)` contract exactly the way world
does:

```bash
bun run --filter @app/rick dev     # http://localhost:5101
bun run --filter @app/morty dev    # http://localhost:5102
```

### Dev mode with hot reload

```bash
bun run dev
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

That frees only this prototype's three ports, and only if a `node` or `bun` process is holding
them. It will not touch anything else listening nearby.

### Every script

| Command | What it does |
| --- | --- |
| `bun run start` | Build all three apps and serve them |
| `bun run dev` | All three on Vite dev servers with HMR |
| `bun run build` | Build all three |
| `bun run build:netlify` | Build all three for one origin and assemble `dist/` |
| `bun run serve` | Serve the existing build without rebuilding |
| `bun run stop` | Free the prototype's ports |
| `bun run typecheck` | `tsc --noEmit` across the workspace |
| `bun run clean` | Remove all `dist` folders |

Every port is pinned with `strictPort: true`, on purpose. World resolves its remotes by absolute
URL, so a remote silently landing on a different port would be worse than a failure. The ports
deliberately avoid 5000, which macOS AirPlay Receiver occupies by default.

---

## What to look at

1. **Click Rick, then Lab.** The URL goes `/rick`, then `/rick/lab`. Now click Morty and walk his
   three pages.
2. **Press the browser back button, repeatedly.** Every step you took is a history entry, the ones
   inside a remote included, and each one lands on the right page in the right remote. Forward
   walks them again. [docs/routing.md](docs/routing.md) explains why.
3. **Watch the probe while you do it.** Each remote's JavaScript, React and wouter included, only
   arrives the first time you visit it. The "Apps on this page" table shows what each remote
   thinks its location is, relative to its base.
4. **Deep link.** Paste `http://localhost:5100/morty/school` into a fresh tab. World mounts morty,
   morty renders School.
5. **Click "Add to shared state" on Rick's Garage, then open Morty's Inventory.** Rick wrote to a
   plain store object world created and handed to each remote at mount time. World's header
   counted it, morty reads it. No React context crossed anything.
6. **Click "Crash rick".** Rick's own error boundary catches it, because rick owns its own React
   root. World and morty never find out. That containment is what the mount contract buys.
7. **Switch the theme.** It reaches into both remotes, because CSS custom properties cascade
   through the DOM regardless of React boundaries. Styling crosses. React state does not.

## How routing works

Routing has its own document: **[docs/routing.md](docs/routing.md)**. It explains how world
matches a prefix and hands the rest of the URL to a remote, what happens on every kind of
navigation including back, forward and deep links, and why three separate copies of wouter agree
on one browser URL.

## How the difference is measured

`packages/shared-core` carries a probe pinned to `globalThis`, so it still sees every app even
though each one has its own copy of the module. Each app registers on load with its own React
namespace, and the probe counts distinct instances by the identity of `React.createElement`, not
by version string. Three apps all reporting `19.2.8` are still three copies if the function is
not the same function. A remote unregisters when world unmounts it, so the table reflects what is
on the page now.

Transfer sizes come from the Resource Timing API. Every app sends `Timing-Allow-Origin: *` so world
can read sizes for scripts fetched from the remotes' origins. On the deployed copy there is only
one origin, so the browser reports them regardless.

---

## The deployed copy

**[micro-fe-prototype.netlify.app](https://micro-fe-prototype.netlify.app)** runs the same three
apps, built the same way, on Netlify.

Locally the three apps are three origins. A static host hands out one, so the deployed build gives
each remote its own path prefix on that single origin instead:

| Path | What |
| --- | --- |
| `/` | world, and every route it owns: `/rick`, `/rick/lab`, `/morty/school`, ... |
| `/apps/rick/` | rick, serves `remoteEntry.js`, and its standalone page |
| `/apps/morty/` | morty, serves `remoteEntry.js`, and its standalone page |

The remotes sit under `/apps/` so their static folders never collide with world's `/rick` and
`/morty` routes. Nothing about the architecture changes. Each app is still built entirely on its
own, world still fetches `remoteEntry.js` at runtime and still resolves remotes by URL, and a
remote can still be rebuilt and redeployed without world being rebuilt. Only the addresses are
different, and only because the host offers one origin rather than three.

`scripts/deploy-target.ts` is the single place those addresses are decided. Every vite config reads
its `base` and world's remote entries from it, and world gets the addresses it prints on screen
injected at build time, so nothing has a port number typed into it. Set `MFE_TARGET=netlify` and
the whole workspace builds for paths; leave it unset and it builds for localhost.
`scripts/assemble-dist.mjs` then stacks the three `dist` folders into one publishable `dist/`,
and `netlify.toml` publishes it.

```bash
bun run build:netlify    # MFE_TARGET=netlify, build all three, assemble dist/
```

The site is connected to this repository, so pushing to `main` builds and publishes it. Netlify
runs that same command in its own build image, against the `BUN_VERSION` and `NODE_VERSION` pinned
in `netlify.toml`, and publishes the `dist/` it produces.

World routes on the path, so `netlify.toml` carries a fallback that sends any path that is not a
real file to world's `index.html`. Netlify serves static files before consulting redirects, so the
remotes' chunks under `/apps/` are unaffected. Each remote's standalone page routes on the path
too, under its own prefix, and gets its own fallback.

---

## How this would be deployed for real

The Netlify deploy above is one origin and one pipeline, which is the convenient shape for a
prototype and the wrong shape for the thing it is a prototype of. This is what changes when each
app belongs to a different team.

Every app builds to plain static assets and deploys independently to its own origin or CDN path.
World resolves remotes by URL at runtime, so **a remote can redeploy without redeploying world**.
That is the property that makes any of this worth the trouble.

```
https://world.example.com/           world
https://rick.example.com/            rick   ->  /remoteEntry.js
https://morty.example.com/           morty  ->  /remoteEntry.js
```

The remote URLs come from config, in one of two ways.

**Build time, simplest.** World reads them from the environment, which means one world build per
environment. This repo already does exactly this, with `MFE_TARGET` selecting an address book in
`scripts/deploy-target.ts`. A real system would read the origins themselves rather than pick a
preset.

**Runtime, better.** World ships with no remote URLs at all and registers them after fetching a
manifest at boot. One artifact promotes unchanged from staging to production, and you can move a
remote or roll one back without a world build:

```ts
import { registerRemotes } from '@module-federation/runtime';

const manifest = await fetch('/config/remotes.json').then((r) => r.json());
registerRemotes(
  manifest.remotes.map((r) => ({ name: r.name, entry: r.entry, type: 'module' })),
);
```

### What the mount contract costs and buys

- **Buying.** Each team upgrades React, wouter, or anything else on its own schedule. A dependency
  conflict in one app cannot break another. A render error in a remote stays in that remote. The
  boundary is framework agnostic, so a remote could later be Svelte or plain DOM.
- **Paying.** Every app ships its own React copy, so the total bundle is larger than a shared
  singleton would be. No shared context, hooks or Suspense coordination across the boundary, so
  providers such as theme, auth and a query client are recreated per app or replaced by plain
  objects like the store handed over at mount. More boilerplate: mount contracts, wrappers, and an
  explicit store or bus.
- **Routing contract.** The one thing every app has to agree on is the URL. World owns the
  prefixes, remotes own everything under theirs, and the base is handed over at mount rather than
  assumed, which is what lets a remote run standalone at `/` and inside world at `/rick`.
