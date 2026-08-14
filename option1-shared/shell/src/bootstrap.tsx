import * as React from 'react';
import { createRoot } from 'react-dom/client';
import '@mfe/ui/styles.css';
import { registerApp } from '@mfe/shared-core';
import { SESSION_MODULE_TOKEN } from '@mfe/session';
import { Shell } from './Shell';

registerApp({
  app: 'shell',
  label: 'host: routing, layout, session',
  role: 'shell',
  react: React,
  sessionToken: SESSION_MODULE_TOKEN,
});

createRoot(document.getElementById('root') as HTMLElement).render(<Shell />);
