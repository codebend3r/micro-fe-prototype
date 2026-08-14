import { createRoot } from 'react-dom/client';
import '@mfe/ui/styles.css';
import './compare.css';
import { Compare } from './Compare';

createRoot(document.getElementById('root') as HTMLElement).render(<Compare />);
