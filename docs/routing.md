# How routing works with wouter

Three apps, three copies of wouter, one browser URL. World matches a prefix and mounts a remote. The remote's own wouter takes the rest of the path from there. Every copy reads `window.location` directly and hears about changes through the same `window` events, so the browser's history is the only source of truth and back, forward, deep links, and links inside a remote all work without any app telling another where it went.

This document walks through the mechanism from the outside in: what the URL looks like, how world matches it, how a remote takes over its slice, what happens on each kind of navigation, and the parts of wouter's implementation that make it hold together across separate React roots. File references are to this repository.

## The shape of it

Three routers, one URL:

> WORLD
```tsx
<Switch>
  <Route path="/" component={Home} />
  <Route path="/rick" nest>  …mount rick with base "/rick"  </Route>
  <Route path="/morty" nest> …mount morty with base "/morty" </Route>
</Switch>
```

> RICK
```tsx
<Router base="/rick">
  <Route path="/" />
  <Route path="/lab" />
</Router>
```

> MORTY
```tsx
<Router base="/morty">
  <Route path="/" />
  <Route path="/school" />
  <Route path="/inventory" />
</Router>
```

World's `nest` routes match a prefix and everything under it, so world never has to know that rick has a `/lab` page. The prefix is passed to the remote as a mount prop, and the remote's own wouter uses it as its `base`: links render with the prefix, matching strips it, and `useLocation()` inside rick reads `/lab` rather than `/rick/lab`.

World keeps a remote mounted for as long as the URL stays under its prefix, so local state inside rick survives moving between rick's own pages. Leaving for morty unmounts rick. Coming back mounts it again, on whichever of its routes the URL names.

## The URL space

World owns three prefixes. Everything under a prefix belongs to the remote it names:

| Browser URL | World matches | Remote sees |
| --- | --- | --- |
| `/` | `Home` | nothing mounted |
| `/rick` | rick's slot | `/` |
| `/rick/lab` | rick's slot | `/lab` |
| `/morty` | morty's slot | `/` |
| `/morty/school` | morty's slot | `/school` |
| `/morty/inventory` | morty's slot | `/inventory` |
| anything else | the not-found route | nothing mounted |

The remote sees a path relative to its prefix. That is the whole trick: rick's source never mentions `/rick`. It declares `/` and `/lab`, and the prefix is supplied from outside at mount time.

## World: one nested route per remote

World renders a `Switch` with a nested route per remote in `world/src/World.tsx`. The `nest` prop is what makes `/rick` also match `/rick/lab`:

```tsx
<Switch>
  <Route path="/" component={Home} />
  <Route path="/rick" nest>
    <RemoteMount name="rick" loader={loadRick} props={rickProps} />
  </Route>
  <Route path="/morty" nest>
    <RemoteMount name="morty" loader={loadMorty} props={mortyProps} />
  </Route>
  <Route>…not found…</Route>
</Switch>
```

Without `nest`, wouter compiles `/rick` to the regular expression `^/rick/?$`, which matches `/rick` and nothing under it. With `nest`, it compiles to `^/rick(?=$|/)`: the path must start with `/rick` and be followed by either the end of the string or a slash. So `/rick/lab` matches and `/ricky` does not. The `Switch` renders the first child whose pattern matches and ignores the rest.

The props handed to each `RemoteMount` carry the prefix. Nothing else in world knows or cares which pages a remote has:

```ts
const shared = { store, bus };
const rickProps = { ...shared, base: '/rick' };
const mortyProps = { ...shared, base: '/morty' };
```

World's own `nest` also wraps the route's children in a `<Router base="/rick">`, which would let world components inside that slot read relative paths. That base never reaches rick, because wouter passes it through React context and context doesn't cross a React root. Rick runs in its own root with its own React, so the prefix has to travel as a plain prop instead. That is why `base` is part of the mount contract.

## The remote: a router with a base

Each remote's `mount` function creates its own React root and renders its own wouter `Router` with the base it was given, in `rick/src/App.tsx`:

```tsx
export default function App({ store, base, identity }) {
  return (
    <Router base={base}>
      <RemoteBoundary app="rick" …>
        <Pages store={store} />
      </RemoteBoundary>
    </Router>
  );
}
```

Inside that router, rick declares its two pages as if it owned the whole URL:

```tsx
<Switch>
  <Route path="/">
    <Home store={store} state={state} />
  </Route>
  <Route path="/lab" component={Lab} />
  <Route>…no page here…</Route>
</Switch>
```

The `base` prop changes two things for everything rendered under the `Router`:

- **Reading**: `useLocation()` returns the browser path with the base removed. At `/rick/lab` it returns `/lab`. At `/rick` it returns `/`. `Route` and `useRoute` match against that relative path, so `path="/lab"` is correct.
- **Writing**: `navigate('/lab')` and `<Link href="/lab">` prepend the base before touching the browser, so the link renders as `href="/rick/lab"` and clicking it pushes `/rick/lab`.

The same source works standalone. `rick/src/bootstrap.tsx` derives the base from Vite's `BASE_URL`, which is empty for the local origin at port 5101 and `/apps/rick` on the deployed copy, and passes it to the same `mount` function world calls.

Morty does the same with three pages: `/`, `/school`, and `/inventory`.

## What happens on each navigation

Every case below ends the same way: some wouter copy calls `history.pushState` or the browser fires `popstate`, and every copy re-reads `window.location.pathname`.

### Clicking a link inside rick

You are at `/rick` and click **Lab**. The sequence:

1. Rick's `Link` calls `preventDefault()` and computes the absolute target: base `/rick` plus href `/lab`.
2. It calls `history.pushState(null, '', '/rick/lab')`. The patched `pushState` dispatches a `pushState` event on `window`.
3. World's wouter hears the event and re-renders. Its `Switch` matches `/rick` again, returns the same element tree, and React keeps `RemoteMount` mounted. Rick's root stays alive.
4. Rick's wouter hears the same event. `useLocation()` now returns `/lab`, and its `Switch` renders `Lab`.

Rick's local state survives, because nothing unmounted. The Lab page's counter demonstrates this: walk to Garage and back, and it keeps counting.

### Clicking Morty in world's header

You are at `/rick/lab` and click **Morty**:

1. World's `Link` pushes `/morty`.
2. World's `Switch` now matches the morty route instead. React unmounts the rick route's subtree, which runs `RemoteMount`'s effect cleanup, which calls the unmount function rick returned from `mount`. Rick's root is torn down on the next task and rick unregisters from the probe.
3. Morty's `RemoteMount` mounts, calls `import('morty/mount')` over module federation (a network fetch the first time, cached after), and mounts morty with base `/morty`.
4. Morty's wouter reads `/morty`, sees `/` relative to its base, and renders its home page.

### Browser back from /morty to /rick/lab

The browser pops a history entry and fires `popstate`. No app called anything:

1. World's wouter re-reads `/rick/lab`. Its `Switch` matches the rick route, so morty's slot unmounts and rick's slot mounts, exactly as in the previous case but in reverse.
2. `RemoteMount` calls `import('rick/mount')` again. The module is already in the browser's module cache, so no network request happens, and `mount` creates a fresh React root.
3. Rick's wouter reads `/rick/lab`, sees `/lab`, and renders `Lab` directly. Rick never passes through its home page on the way.

Rick's local state does not survive this, because it is a new root. The Lab counter starts at zero.

### Forward, and every other history move

Forward is the same `popstate` mechanism in the other direction. Because every step you took pushed a real entry, forward and back walk exactly the pages you visited, including the ones inside a remote.

### Deep links and reloads

Loading `/morty/school` in a fresh tab runs the initial render with that path already in `window.location`. World's `Switch` matches `/morty`, mounts morty, and morty's `Switch` matches `/school`. There is no redirect and no intermediate page.

For that to work the server has to return world's `index.html` for a path that is not a real file. Vite's dev and preview servers do that by default. On Netlify, `netlify.toml` carries a `/*` fallback to `/index.html`, plus one fallback per remote's standalone page under `/apps/`. Netlify serves real files before consulting those rules, so the remotes' chunks are unaffected.

### Escaping the base

A link inside a remote can point outside its prefix with a `~`. Morty's Inventory page links to rick with `<Link href="~/rick">`. Wouter drops the `~` and uses the rest as an absolute path instead of prepending `/morty`.

## Why three copies of wouter agree

Nothing is shared over module federation, so world, rick, and morty each bundle their own wouter alongside their own React. Three details of wouter's implementation make that safe.

**One patch of the History API.** The browser fires `popstate` for back and forward but nothing for `pushState`, so wouter wraps `history.pushState` and `history.replaceState` to dispatch a `window` event after each call. It guards the patch with a flag stored at `Symbol.for('wouter_v3')` on `window`. World's copy loads first and installs the patch. Rick's and morty's copies find the flag and skip it. Every navigation therefore produces one event, not three.

**Subscriptions live on `window`, not in a module.** Each copy subscribes to `popstate`, `pushState`, `replaceState`, and `hashchange` on the global `window` through its own React's `useSyncExternalStore`. A `pushState` from any copy is heard by all of them. The snapshot each copy reads is `location.pathname`, a string, so a copy whose relevant path did not change re-renders nothing.

**Base is local to a `Router`, not to the copy.** The base lives in React context under the `Router` element, and wouter appends a nested `Router`'s base to its parent's. Inside rick's root there is no parent, so `base="/rick"` is the whole base. World's context is invisible from there, which is exactly why the prefix is passed in explicitly rather than inherited.

## Details worth knowing

- **Matching is case-insensitive**: wouter compiles patterns with the `i` flag and strips the base without regard to case, so `/Rick/Lab` works.
- **Trailing slashes are tolerated**: an exact pattern compiles with `/?$`, so `/rick/lab/` renders Lab.
- **Active links match the relative path exactly**: the remotes' `NavLink` helper uses `useRoute(href)`, so the **Garage** link is active at `/rick` and not at `/rick/lab`. World's header uses a prefix check instead, so **Rick** stays highlighted on every rick page.
- **`RemoteMount` keys on the loader, not the URL**: its effect depends only on the `loader` identity, which is a module-level constant. That is what keeps a remote mounted while the URL moves within its prefix. Passing a fresh loader function on each render would remount the remote on every navigation.
- **Unmount is deferred by one task**: a remote's returned cleanup calls `root.unmount()` inside `setTimeout`, because unmounting one React root synchronously from inside another root's commit phase logs a warning.
