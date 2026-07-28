import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ComposerWorkspace } from './system-b/ComposerWorkspace';
import './system-b/system-b.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ComposerWorkspace />
  </StrictMode>,
);
