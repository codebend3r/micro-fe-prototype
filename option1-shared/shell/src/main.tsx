// Async boundary. The federation runtime has to negotiate shared modules
// before any of them is imported, so the real entry point is dynamic.
import('./bootstrap');

export {};
