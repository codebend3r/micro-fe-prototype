declare module 'app1/mount' {
  export function mount(
    el: HTMLElement,
    props: Record<string, unknown>,
  ): () => void;
}

declare module 'app2/mount' {
  export function mount(
    el: HTMLElement,
    props: Record<string, unknown>,
  ): () => void;
}
