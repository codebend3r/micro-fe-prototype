import { createLogger, type Logger, type Rollup } from 'vite';

/**
 * Two warnings show up in every build of this repo, both harmless, both
 * alarming to read. They are filtered here rather than in six vite configs.
 */

const IGNORED_WARNINGS = [
  // @module-federation/vite ships an SSR helper that imports node:vm. The
  // browser build never reaches it, but Vite reports the externalization.
  'Module "vm" has been externalized for browser compatibility',
];

export function quietLogger(): Logger {
  const logger = createLogger();
  const warn = logger.warn.bind(logger);

  logger.warn = (message, options) => {
    if (IGNORED_WARNINGS.some((ignored) => message.includes(ignored))) return;
    warn(message, options);
  };

  return logger;
}

/**
 * Module federation emits a placeholder chunk per shared module, and the ones
 * that resolve to a host provided singleton come out empty. The output is
 * correct; Rollup just notices the empty file.
 */
export function silenceEmptyChunks(warning: Rollup.RollupLog, next: Rollup.LoggingFunction) {
  if (warning.code === 'EMPTY_BUNDLE') return;
  next(warning);
}
