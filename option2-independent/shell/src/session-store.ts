import { createSessionStore } from '@mfe/shared-core';

/**
 * The same store as Option 1, reached a completely different way. Here the
 * Shell hands this object to each remote as a mount prop, and the remote
 * subscribes to it directly. No React context is involved, because there is no
 * shared React to carry one.
 */
export const store = createSessionStore();
