import * as React from 'react';
import { createRoot } from 'react-dom/client';
import '@mfe/ui/styles.css';
import { registerApp } from '@mfe/shared-core';
import { World } from './World';

registerApp({
  app: 'world',
  label: 'shell: routing, layout, session',
  role: 'shell',
  react: React,
});

createRoot(document.getElementById('root') as HTMLElement).render(<World />);
