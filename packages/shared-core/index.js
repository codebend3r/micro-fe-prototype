/**
 * @mfe/shared-core
 *
 * Framework agnostic primitives used by world and by both remotes. Nothing in
 * this file imports React, which is precisely what makes the `mount(el, props)`
 * contract possible: world can hand this store to a remote that is running its
 * own React copy, or no React at all.
 *
 * Nothing is federated as shared, so each app bundles its own copy of this
 * module. The bus and the probe below are deliberately pinned to `globalThis`
 * so that every copy talks to the same objects.
 */

/* -------------------------------------------------------------- store --- */

/** Minimal observable store. No React, no dependencies. */
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      if (next === state) return;
      state = { ...state, ...next };
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * The one piece of application state world owns and both remotes touch.
 *
 * `selection` is deliberately boring: a list of items rick adds and morty
 * reads. Its only job is to be a value that visibly crosses an app boundary.
 * Routing is not in here; wouter owns the URL in every app.
 */
export function createSessionStore() {
  const store = createStore({
    user: { name: 'Dana Okafor', role: 'Operations lead' },
    theme: 'dark',
    selection: [],
  });

  return {
    ...store,

    setTheme(theme) {
      store.setState({ theme });
      bus.emit('session:theme', { theme });
    },

    addToSelection(sku) {
      const { selection } = store.getState();
      const existing = selection.find((item) => item.sku === sku);
      const next = existing
        ? selection.map((item) =>
            item.sku === sku ? { ...item, count: item.count + 1 } : item,
          )
        : [...selection, { sku, count: 1 }];
      store.setState({ selection: next });
      bus.emit('selection:changed', { sku, selection: next });
    },

    removeFromSelection(sku) {
      const next = store.getState().selection.filter((item) => item.sku !== sku);
      store.setState({ selection: next });
      bus.emit('selection:changed', { sku, selection: next });
    },

    clearSelection() {
      store.setState({ selection: [] });
      bus.emit('selection:changed', { sku: null, selection: [] });
    },
  };
}

/* ---------------------------------------------------------------- bus --- */

export function createBus() {
  const channels = new Map();
  const logListeners = new Set();
  let seq = 0;
  // Replaced rather than mutated so that useSyncExternalStore sees a new
  // reference and re renders.
  let log = [];

  return {
    on(type, handler) {
      if (!channels.has(type)) channels.set(type, new Set());
      channels.get(type).add(handler);
      return () => channels.get(type)?.delete(handler);
    },
    emit(type, detail) {
      log = [{ type, detail, seq: ++seq }, ...log].slice(0, 10);
      for (const handler of channels.get(type) ?? []) handler(detail);
      for (const listener of logListeners) listener();
    },
    getLog: () => log,
    onLog(listener) {
      logListeners.add(listener);
      return () => {
        logListeners.delete(listener);
      };
    },
  };
}

/**
 * Global on purpose. Every app carries its own copy of this module, so a
 * module scoped bus would give each app a private channel and nothing would
 * ever cross the boundary.
 */
export const bus = (globalThis.__MFE_BUS__ ??= createBus());

/* -------------------------------------------------------------- probe --- */

const probe = (globalThis.__MFE_PROBE__ ??= {
  counters: {},
  ids: new WeakMap(),
  apps: new Map(),
  listeners: new Set(),
  snapshot: null,
});

function idFor(prefix, object) {
  if (!object) return null;
  let id = probe.ids.get(object);
  if (!id) {
    probe.counters[prefix] = (probe.counters[prefix] ?? 0) + 1;
    id = `${prefix}#${probe.counters[prefix]}`;
    probe.ids.set(object, id);
  }
  return id;
}

function invalidate() {
  probe.snapshot = null;
  for (const listener of probe.listeners) listener();
}

/**
 * Called once per app as it boots.
 * `react` is the app's imported React namespace object. Two apps that pass the
 * same object are running on the same React instance. Here every app brings
 * its own, so the probe counts one instance per loaded app.
 */
export function registerApp({ app, label, role, react }) {
  // Identity is taken from `createElement` rather than the namespace object.
  // A bundler can hand each importing chunk its own namespace wrapper around
  // one shared module, but the functions inside it are the same references.
  const reactIdentity = react?.createElement ?? react;

  const record = {
    ...probe.apps.get(app),
    app,
    label,
    role,
    reactVersion: react?.version ?? 'unknown',
    reactId: idFor('react', reactIdentity),
  };

  probe.apps.set(app, record);
  invalidate();
  return record;
}

export function updateApp(app, patch) {
  const current = probe.apps.get(app);
  if (!current) return;
  let changed = false;
  for (const key of Object.keys(patch)) {
    if (current[key] !== patch[key]) changed = true;
  }
  if (!changed) return;
  probe.apps.set(app, { ...current, ...patch });
  invalidate();
}

export function unregisterApp(app) {
  if (probe.apps.delete(app)) invalidate();
}

/** One bucket per distinct React instance, listing the apps running on it. */
function groupByReact(apps) {
  const buckets = new Map();
  for (const record of apps) {
    const id = record.reactId;
    if (!id) continue;
    if (!buckets.has(id)) buckets.set(id, { id, apps: [], version: record.reactVersion });
    buckets.get(id).apps.push(record.app);
  }
  return [...buckets.values()];
}

export function getProbeSnapshot() {
  if (!probe.snapshot) {
    const apps = [...probe.apps.values()];
    probe.snapshot = { apps, reactInstances: groupByReact(apps) };
  }
  return probe.snapshot;
}

export function subscribeProbe(listener) {
  probe.listeners.add(listener);
  return () => {
    probe.listeners.delete(listener);
  };
}

/**
 * Real numbers for the "how much JavaScript did this cost" row. Cross origin
 * sizes are only readable because every app sends `Timing-Allow-Origin: *`
 * (see the `headers` blocks in each vite.config.ts).
 */
export function measureScripts() {
  if (typeof performance?.getEntriesByType !== 'function') {
    return { chunks: 0, bytes: 0, byOrigin: [] };
  }
  const entries = performance
    .getEntriesByType('resource')
    .filter((entry) => /\.(m?js)(\?|$)/.test(entry.name));

  const byOrigin = new Map();
  let bytes = 0;

  for (const entry of entries) {
    const size = entry.encodedBodySize || entry.transferSize || 0;
    bytes += size;
    const origin = new URL(entry.name).origin;
    const bucket = byOrigin.get(origin) ?? { origin, chunks: 0, bytes: 0 };
    bucket.chunks += 1;
    bucket.bytes += size;
    byOrigin.set(origin, bucket);
  }

  return {
    chunks: entries.length,
    bytes,
    byOrigin: [...byOrigin.values()].sort((a, b) => b.bytes - a.bytes),
  };
}

/* ------------------------------------------------------------ catalog --- */

/** Placeholder rows. Nothing here is priced, sold, or sent anywhere. */
export const CATALOG = [
  { sku: 'PG-0001', name: 'Portal gun fluid', category: 'Portal' },
  { sku: 'MS-0042', name: 'Microverse battery', category: 'Power' },
  { sku: 'MK-0137', name: 'Meeseeks box', category: 'Labour' },
  { sku: 'PL-0210', name: 'Plumbus', category: 'Household' },
  { sku: 'BF-0666', name: 'Butter passing robot', category: 'Robotics' },
  { sku: 'SZ-0099', name: 'Szechuan sauce', category: 'Condiments' },
];

export function findPart(sku) {
  return CATALOG.find((part) => part.sku === sku);
}

export function formatBytes(bytes) {
  if (!bytes) return '0 kB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
