/**
 * The two federated modules world imports at runtime. Each remote exposes
 * exactly one thing: its mount function.
 */
declare module 'rick/mount' {
  export function mount(el: HTMLElement, props: Record<string, unknown>): () => void;
}

declare module 'morty/mount' {
  export function mount(el: HTMLElement, props: Record<string, unknown>): () => void;
}
