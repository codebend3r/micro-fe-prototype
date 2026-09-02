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

export type AppKey = 'world' | 'rick' | 'morty' | 'jerry';

/**
 * Jerry is a guest: a remote built and served from a different repository,
 * github.com/codebend3r/micro-fe-prototype--guest. This repo never builds it
 * and never lays out its output; it only needs to know where it is. Locally
 * that is the next port after morty's. Anywhere else, `JERRY_ORIGIN` names the
 * origin jerry's build is hosted on, trailing slash included.
 */
const JERRY_LOCAL = 'http://localhost:5103/';
const jerryOrigin = process.env.JERRY_ORIGIN ?? JERRY_LOCAL;
const jerry: AppAddress = {
  base: jerryOrigin,
  url: jerryOrigin,
  label: jerryOrigin.replace(/^https?:\/\//, '').replace(/\/$/, ''),
};

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
  jerry,
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
  // Not on this origin. Without JERRY_ORIGIN the deployed world still points at
  // localhost, and its jerry slot reports a load failure rather than a crash.
  jerry,
};

export const target = process.env.MFE_TARGET === 'netlify' ? 'netlify' : 'local';

/** The address book this build is compiled against. */
export const at: Record<AppKey, AppAddress> = target === 'netlify' ? DEPLOYED : LOCAL;

/** The federation entry world points at to load a remote. */
export function remoteEntry(app: AppKey): string {
  return `${at[app].url}remoteEntry.js`;
}
