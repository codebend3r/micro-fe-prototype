import type { ComponentType, ReactElement, ReactNode } from 'react';

export function RemoteBoundary(props: {
  app: string;
  version: string;
  instanceId: string;
  children?: ReactNode;
}): ReactElement;

export const ErrorBoundary: ComponentType<{
  owner: string;
  hint?: string;
  children?: ReactNode;
}>;

export function Code(props: { children?: ReactNode }): ReactElement;
