/**
 * Where each of the seven apps lives.
 *
 * Locally they are seven origins on seven ports, which is the honest shape of
 * a micro frontend system: every app is built on its own, served on its own,
 * and reached by absolute URL. A static host hands out one origin, so the
 * deployed build gives each app its own path prefix on that single origin
 * instead. The six builds stay independent and the Shells still resolve their
 * remotes at runtime over module federation; only the addresses change.
 *
 * Set `MFE_TARGET=netlify` at build time to bake in the deployed addresses.
 * Anything else, including nothing at all, builds for localhost.
 *
 * The `AppAddress` type is declared globally in `scripts/build-globals.d.ts`,
 * alongside the constants each vite config injects into app source.
 */

// The vite configs run in Node. This repo's tsconfig loads only the browser
// lib, so declare the one thing read here rather than pull in @types/node.
declare const process: { env: Record<string, string | undefined> };

export type AppKey =
  | 'compare'
  | 'o1shell'
  | 'o1app1'
  | 'o1app2'
  | 'o2shell'
  | 'o2app1'
  | 'o2app2';

/**
 * Seven ports. A Shell is served at the root of its own port, so its `base` is
 * just `/`. A remote's `base` has to be the absolute origin, because its chunk
 * URLs are resolved by a page running on a different origin.
 */
const LOCAL: Record<AppKey, AppAddress> = {
  compare: { base: '/', url: 'http://localhost:5100/', label: 'localhost:5100' },
  o1shell: { base: '/', url: 'http://localhost:5010/', label: 'localhost:5010' },
  o1app1: {
    base: 'http://localhost:5011/',
    url: 'http://localhost:5011/',
    label: 'localhost:5011',
  },
  o1app2: {
    base: 'http://localhost:5012/',
    url: 'http://localhost:5012/',
    label: 'localhost:5012',
  },
  o2shell: { base: '/', url: 'http://localhost:5020/', label: 'localhost:5020' },
  o2app1: {
    base: 'http://localhost:5021/',
    url: 'http://localhost:5021/',
    label: 'localhost:5021',
  },
  o2app2: {
    base: 'http://localhost:5022/',
    url: 'http://localhost:5022/',
    label: 'localhost:5022',
  },
};

/**
 * One origin, seven path prefixes. `scripts/assemble-dist.mjs` lays the built
 * output out to match, and `netlify.toml` publishes the result. All three have
 * to agree on these paths.
 */
const DEPLOYED: Record<AppKey, AppAddress> = {
  compare: { base: '/', url: '/', label: '/' },
  o1shell: { base: '/option1/shell/', url: '/option1/shell/', label: '/option1/shell' },
  o1app1: { base: '/option1/app1/', url: '/option1/app1/', label: '/option1/app1' },
  o1app2: { base: '/option1/app2/', url: '/option1/app2/', label: '/option1/app2' },
  o2shell: { base: '/option2/shell/', url: '/option2/shell/', label: '/option2/shell' },
  o2app1: { base: '/option2/app1/', url: '/option2/app1/', label: '/option2/app1' },
  o2app2: { base: '/option2/app2/', url: '/option2/app2/', label: '/option2/app2' },
};

export const target = process.env.MFE_TARGET === 'netlify' ? 'netlify' : 'local';

/** The address book this build is compiled against. */
export const at: Record<AppKey, AppAddress> = target === 'netlify' ? DEPLOYED : LOCAL;

/** The federation entry a Shell points at to load a remote. */
export function remoteEntry(app: AppKey): string {
  return `${at[app].url}remoteEntry.js`;
}
