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

## Run it

```bash
pnpm install
pnpm start
```

Then open **http://localhost:5000**. That page runs both complete systems in two iframes, drives
them in lockstep, and collects live probe readings from each so the differences land in one table.

| Port | What |
| --- | --- |
| 5000 | Comparison harness |
| 5010 | Option 1 Shell |
| 5011 | Option 1 `app1`, inventory, React 19 |
| 5012 | Option 1 `app2`, orders, React 19 |
| 5020 | Option 2 Shell |
| 5021 | Option 2 `app1`, inventory, **React 18** |
| 5022 | Option 2 `app2`, orders, React 19 |

Every remote also runs standalone at its own port, driving the same contract the Shell uses.

Other scripts:

| Command | What it does |
| --- | --- |
| `pnpm start` | Build all six apps, then serve everything from the built output |
| `pnpm build` | Build all six apps |
| `pnpm serve` | Serve the existing build (skips rebuilding) |
| `pnpm dev` | All seven apps on Vite dev servers with HMR. Remotes serve `remoteEntry.js` straight from the dev server |
| `pnpm clean` | Remove all `dist` folders |

`pnpm start` is the one to use for comparing. Module federation and bundle size numbers are only
meaningful against built output.

## What to look at

1. **Click "Load every remote"** in the harness toolbar. Both systems fetch all of their code.
   Watch the live table fill in.
2. **React copies on the page.** Option 1 stays at 1. Option 2 climbs to 3. This is the single
   fact everything else follows from.
3. **React versions.** Option 2 shows `18.3.1 + 19.2.8` running in the same tab, in the same
   document, at the same time.
4. **How remotes reach shell state.** Option 1's remotes report `react context`. Option 2's remotes
   report `mount props`, and each one visibly prints `useSession() returned null`. The Option 2
   Shell renders exactly the same `<SessionProvider>` as Option 1. The remotes just cannot see it.
5. **JavaScript transferred.** Option 2 ships React three times, and the number says so.
6. **Add a part in Inventory, then open Orders.** Cross app updates work in both, through different
   machinery: shared React context in Option 1, a plain store object passed at mount time in
   Option 2.
7. **Click "Throw a render error"** inside a remote. In Option 1 the Shell's error boundary catches
   it, because there is one reconciler. In Option 2 the remote's own boundary catches it and the
   Shell never finds out, which is the fault isolation Option 2 is bought for.
8. **Switch the theme.** It works in both, because CSS custom properties cascade through the DOM
   regardless of React boundaries. Styling crosses. React state does not.

## How the difference is measured

`packages/shared-core` carries a probe pinned to `globalThis`, so it still sees every app even when
the module itself has been duplicated. Each app registers itself on load with its own React
namespace, and the probe counts distinct instances by the identity of `React.createElement`, not by
version string. Two apps reporting `19.2.8` are still two copies if the function is not the same
function.

Transfer sizes come from the Resource Timing API. Every app sends `Timing-Allow-Origin: *` so the
Shell can read sizes for scripts fetched from the remotes' origins.

Both Shells render the identical `ProbePanel` from `packages/ui`, so the two sides are measured by
the same code.

## Layout

```
packages/
  shared-core/   framework agnostic: store, event bus, probe, catalog. No React.
  session/       the React binding. This module is the whole argument, in 40 lines.
  ui/            one stylesheet, the probe panel, remote chrome, shell hooks
compare/         the side by side harness on :5000
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

## Notes and caveats

- The remotes import the stylesheet only in their standalone entry, not in the exposed module.
  Both options assume a shared design system loaded by the host, which keeps the JavaScript
  comparison clean. A fully independent Option 2 remote would normally ship its own CSS.
- Option 2 remotes defer `root.unmount()` by one task. Unmounting a React 18 root synchronously
  from inside the Shell's React 19 commit phase logs a warning.
- The harness talks to the Shells with `postMessage` and `'*'` as the target origin. Fine for a
  local prototype, not for production.
- `dts: false` is set on every federation config because this repo keeps a single tsconfig at the
  root rather than one per app.
- Remote entry URLs are hardcoded to localhost ports. In production these come from environment
  config, and remotes redeploy without redeploying the Shell.

## Recommendation

Start with Option 1 if all apps are owned by one org with an aligned stack. It is simpler, faster
and lighter. Choose Option 2 when the version split is the point: incremental React upgrades,
acquisitions with different stacks, or large orgs where teams must ship without coordinating
dependencies.

They are not mutually exclusive. Designing the `mount(el, props)` contract from day one, which is
Option 2's boundary, while still sharing React as a singleton, which is Option 1's performance,
lets you un share React later without rewriting the integration layer.
