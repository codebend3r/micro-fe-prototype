/**
 * Addresses baked into app source at build time.
 *
 * The Shells name their remotes on screen and the harness frames both Shells,
 * so a handful of components need to know where the other apps are. Those
 * addresses differ between a local run and a deployed one, so each vite config
 * injects them through `define` from `scripts/deploy-target.ts` rather than
 * hardcoding a port that is only true on one machine.
 */

declare type AppAddress = {
  /** Vite's `base`: the prefix baked into every asset URL the app emits. */
  base: string;
  /** How another app reaches this one. Always ends in a slash. */
  url: string;
  /** What the UI prints when it names this app's address. */
  label: string;
};

/** The Shell's two remotes. Each Shell's vite config injects its own pair. */
declare const __REMOTE_APP1__: AppAddress;
declare const __REMOTE_APP2__: AppAddress;

/** The two Shells the comparison harness frames. Injected by `compare`. */
declare const __SHELL_ONE__: AppAddress;
declare const __SHELL_TWO__: AppAddress;
