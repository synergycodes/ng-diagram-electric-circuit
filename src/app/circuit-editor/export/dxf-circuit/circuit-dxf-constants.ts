export const LAYERS = {
  COMPONENTS: 'COMPONENTS',
  WIRES: 'WIRES',
  LABELS: 'LABELS',
} as const;

export const ACI = {
  WHITE: 7,
} as const;

export const TEXT_STYLE = {
  STANDARD: 'STANDARD',
  BOLD: 'BOLD',
} as const;

/**
 * Lineweights in 1/100 mm (DXF group code 370). Must use values from the
 * DXF standard lineweight enum: 0, 5, 9, 13, 15, 18, 20, 25, 30, 35, ...
 */
export const LINE_WEIGHT = {
  SYMBOL: 25,
  WIRE: 35,
  JUNCTION: 25,
} as const;

/** Conversion factor: DXF millimetres per one diagram unit. Fixed (no paper fitting). */
export const DXF_SCALE_MM_PER_PX = 0.3;

/** Padding around the diagram in diagram units. */
export const DIAGRAM_PADDING = 50;

/**
 * Reserved label-row heights, mirroring REF_ROW_HEIGHT / VALUE_ROW_HEIGHT in
 * component-catalog.ts. The renderer reads the live catalog for exact numbers;
 * these are re-exported for readability at the renderer call sites.
 */
export const FONT_REFERENCE = 12;
export const FONT_VALUE = 11;

/**
 * Sampling step (in symbol viewBox units) used to flatten curved SVG symbol
 * geometry — arcs, circles, rounded rects — into DXF polylines. Small enough
 * that the flattened outline is visually indistinguishable from the rendered
 * curve at schematic scale.
 */
export const CURVE_SAMPLE_STEP = 1.5;
