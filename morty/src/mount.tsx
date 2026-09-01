/**
 * Morty's public surface, exposed to world as './mount'.
 *
 * This file is the entire contract between two teams: give me a DOM node and
 * a bag of plain props, get back a function that tears everything down.
 * Morty's React and Morty's wouter live on this side of the line and never
 * leak across it.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { registerApp, unregisterApp } from '@mfe/shared-core';
import { ErrorBoundary } from '@mfe/ui/chrome';
import App, { type RemoteProps } from './App';

const identity = registerApp({
  app: 'morty',
  label: 'remote: 3 routes, reads the shared state',
  role: 'remote',
  react: React,
});

export function mount(el: HTMLElement, props: Record<string, unknown>) {
  const root = createRoot(el);

  root.render(
    // Morty brings its own error boundary, because world's cannot reach in.
    <ErrorBoundary
      owner="morty"
      hint="morty renders in its own React root. World and rick never saw this error."
    >
      <App {...(props as unknown as RemoteProps)} identity={identity} />
    </ErrorBoundary>,
  );

  return () => {
    // Deferred by one task. Unmounting a root synchronously from inside
    // another root's commit phase logs a warning.
    setTimeout(() => {
      root.unmount();
      unregisterApp('morty');
    }, 0);
  };
}
