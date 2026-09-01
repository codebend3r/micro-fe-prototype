import { createSessionStore } from '@mfe/shared-core';

/**
 * The one store on the page. World reads it through React context; each
 * remote gets this same object as a mount prop and subscribes to it directly,
 * because there is no shared React to carry a context across the boundary.
 */
export const store = createSessionStore();
