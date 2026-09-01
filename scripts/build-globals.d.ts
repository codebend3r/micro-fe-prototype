/**
 * Addresses baked into app source at build time.
 *
 * The world shell names its remotes on screen, so it needs to know where they
 * are. Those addresses differ between a local run and a deployed one, so the
 * vite config injects them through `define` from `scripts/deploy-target.ts`
 * rather than hardcoding a port that is only true on one machine.
 */

declare type AppAddress = {
  /** Vite's `base`: the prefix baked into every asset URL the app emits. */
  base: string;
  /** How another app reaches this one. Always ends in a slash. */
  url: string;
  /** What the UI prints when it names this app's address. */
  label: string;
};

/** The two remotes. Injected by world's vite config. */
declare const __REMOTE_RICK__: AppAddress;
declare const __REMOTE_MORTY__: AppAddress;
