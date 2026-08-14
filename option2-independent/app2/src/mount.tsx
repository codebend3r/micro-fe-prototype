/**
 * app2's public surface, exposed to the Shell as './mount'.
 *
 * Identical contract to app1, implemented on React 19 rather than 18. That is
 * the whole point: the Shell does not know or care which version is inside.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { registerApp } from '@mfe/shared-core';
import { SESSION_MODULE_TOKEN } from '@mfe/session';
import { ErrorBoundary } from '@mfe/ui/chrome';
import App, { type RemoteProps } from './App';

const identity = registerApp({
  app: 'app2',
  label: 'remote: orders on React 19',
  role: 'remote',
  react: React,
  sessionToken: SESSION_MODULE_TOKEN,
});

export function mount(el: HTMLElement, props: Record<string, unknown>) {
  const root = createRoot(el);

  root.render(
    <ErrorBoundary
      owner="app2"
      hint="app2 renders in its own React 19 root. The Shell and app1 never saw this error."
    >
      <App {...(props as unknown as RemoteProps)} identity={identity} />
    </ErrorBoundary>,
  );

  return () => {
    setTimeout(() => root.unmount(), 0);
  };
}
