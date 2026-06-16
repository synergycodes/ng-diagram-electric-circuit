import { InjectionToken } from '@angular/core';

export interface CircuitEditorConfig {
  /** Viewport behavior. */
  viewport: {
    /** Extra padding (px) around all sides when fitting the schematic in view. */
    zoomToFitPadding: number;
    /** Scale increment per zoom-in / zoom-out click. */
    zoomStep: number;
  };
}

export const CIRCUIT_EDITOR_DEFAULTS: CircuitEditorConfig = {
  viewport: {
    zoomToFitPadding: 80,
    zoomStep: 0.1,
  },
};

export const CIRCUIT_EDITOR_CONFIG = new InjectionToken<CircuitEditorConfig>(
  'CIRCUIT_EDITOR_CONFIG',
  { factory: () => CIRCUIT_EDITOR_DEFAULTS },
);
