/**
 * app1's public surface, exposed to the Shell as './mount'.
 *
 * This file is the entire contract between two teams: give me a DOM node and
 * a bag of plain props, get back a function that tears everything down. React
 * 18 lives on this side of the line and never leaks across it.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { registerApp } from '@mfe/shared-core';
import { SESSION_MODULE_TOKEN } from '@mfe/session';
import { ErrorBoundary } from '@mfe/ui/chrome';
import App, { type RemoteProps } from './App';

const identity = registerApp({
  app: 'app1',
  label: 'remote: inventory on React 18',
  role: 'remote',
  react: React,
  sessionToken: SESSION_MODULE_TOKEN,
});

export function mount(el: HTMLElement, props: Record<string, unknown>) {
  const root = createRoot(el);

  root.render(
    // app1 brings its own error boundary, because the Shell's cannot reach in.
    <ErrorBoundary
      owner="app1"
      hint="app1 renders in its own React 18 root. The Shell and app2 never saw this error."
    >
      <App {...(props as unknown as RemoteProps)} identity={identity} />
    </ErrorBoundary>,
  );

  return () => {
    // Deferred by one task. Unmounting a React 18 root synchronously from
    // inside the Shell's React 19 commit phase logs a warning.
    setTimeout(() => root.unmount(), 0);
  };
}
