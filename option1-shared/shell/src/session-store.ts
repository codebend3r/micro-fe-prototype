import { createSessionStore } from '@mfe/shared-core';

/**
 * One store for the whole system. In Option 1 the remotes never touch this
 * object directly. They reach it through React context, because @mfe/session
 * is a federated singleton and the context object inside it is therefore the
 * same object in all three apps.
 */
export const store = createSessionStore();
