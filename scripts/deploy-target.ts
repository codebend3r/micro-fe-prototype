/**
 * Where each of the three apps lives.
 *
 * Locally they are three origins on three ports, which is the honest shape of
 * a micro frontend system: every app is built on its own, served on its own,
 * and reached by absolute URL. A static host hands out one origin, so the
 * deployed build gives each remote its own path prefix on that single origin
 * instead. The builds stay independent and world still resolves its remotes at
 * runtime over module federation; only the addresses change.
 *
 * Set `MFE_TARGET=netlify` at build time to bake in the deployed addresses.
 * Anything else, including nothing at all, builds for localhost.
 *
 * The `AppAddress` type is declared globally in `scripts/build-globals.d.ts`,
 * alongside the constants world's vite config injects into app source.
 */

// The vite configs run in Node. This repo's tsconfig loads only the browser
// lib, so declare the one thing read here rather than pull in @types/node.
declare const process: { env: Record<string, string | undefined> };

export type AppKey = 'world' | 'rick' | 'morty';

/**
 * Three ports. World is served at the root of its own port, so its `base` is
 * just `/`. A remote's `base` has to be the absolute origin, because its chunk
 * URLs are resolved by a page running on a different origin.
 */
const LOCAL: Record<AppKey, AppAddress> = {
  world: { base: '/', url: 'http://localhost:5100/', label: 'localhost:5100' },
  rick: {
    base: 'http://localhost:5101/',
    url: 'http://localhost:5101/',
    label: 'localhost:5101',
  },
  morty: {
    base: 'http://localhost:5102/',
    url: 'http://localhost:5102/',
    label: 'localhost:5102',
  },
};

/**
 * One origin, three path prefixes. The remotes sit under `/apps/` so their
 * static folders never collide with world's `/rick` and `/morty` routes.
 * `scripts/assemble-dist.mjs` lays the built output out to match, and
 * `netlify.toml` publishes the result. All three have to agree on these paths.
 */
const DEPLOYED: Record<AppKey, AppAddress> = {
  world: { base: '/', url: '/', label: '/' },
  rick: { base: '/apps/rick/', url: '/apps/rick/', label: '/apps/rick' },
  morty: { base: '/apps/morty/', url: '/apps/morty/', label: '/apps/morty' },
};

export const target = process.env.MFE_TARGET === 'netlify' ? 'netlify' : 'local';

/** The address book this build is compiled against. */
export const at: Record<AppKey, AppAddress> = target === 'netlify' ? DEPLOYED : LOCAL;

/** The federation entry world points at to load a remote. */
export function remoteEntry(app: AppKey): string {
  return `${at[app].url}remoteEntry.js`;
}
