/**
 * The federated modules world imports at runtime. Each remote exposes
 * exactly one thing: its mount function. Jerry's comes from a different
 * repository, which changes nothing here: the contract is the same.
 */
declare module 'rick/mount' {
  export function mount(el: HTMLElement, props: Record<string, unknown>): () => void;
}

declare module 'morty/mount' {
  export function mount(el: HTMLElement, props: Record<string, unknown>): () => void;
}

declare module 'jerry/mount' {
  export function mount(el: HTMLElement, props: Record<string, unknown>): () => void;
}
