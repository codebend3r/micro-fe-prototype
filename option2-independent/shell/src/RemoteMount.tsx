/**
 * The integration seam for Option 2.
 *
 * The Shell renders an empty div, hands it to the remote's `mount` function,
 * and calls the returned cleanup on unmount. Everything inside that div is
 * owned by a different React root, running a possibly different React version.
 * The Shell's Suspense and error boundaries do not reach into it, and neither
 * does its context.
 */
import { useEffect, useRef, useState } from 'react';

export type MountFn = (el: HTMLElement, props: Record<string, unknown>) => () => void;

export function RemoteMount({
  name,
  loader,
  props,
}: {
  name: string;
  loader: () => Promise<{ mount: MountFn }>;
  props: Record<string, unknown>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unmount: (() => void) | undefined;
    let cancelled = false;

    setStatus('loading');
    loader()
      .then(({ mount }) => {
        if (cancelled || !host.current) return;
        // Props are handed over once. Later updates arrive through the store
        // the remote subscribes to, not through a re render.
        unmount = mount(host.current, props);
        setStatus('ready');
      })
      .catch((cause: Error) => {
        if (cancelled) return;
        setError(cause);
        setStatus('failed');
      });

    return () => {
      cancelled = true;
      unmount?.();
    };
    // `props` is intentionally not a dependency: remounting on every prop
    // change would tear down and rebuild the remote's entire React tree.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader]);

  return (
    <>
      {status === 'loading' ? (
        <div className="loading">fetching {name}/mount over module federation</div>
      ) : null}
      {status === 'failed' ? (
        <div className="crash">
          <strong>{name} failed to load</strong>
          <code>{error?.message}</code>
          <p className="small muted">
            The Shell and the other remote are untouched. That containment is the point of
            Option 2.
          </p>
        </div>
      ) : null}
      <div ref={host} />
    </>
  );
}
