import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./circuit-editor/pages/circuit-editor-page.component').then(
        (m) => m.CircuitEditorPageComponent,
      ),
  },
  // Unknown URLs fall back to the editor instead of rendering nothing.
  { path: '**', redirectTo: '' },
];
