// Tunables for the link-drop-preview feature.

import { GRID_UNIT } from '../../../model/component-catalog';

/** Cursor-to-port snap distance — a real port connection wins over a ghost junction. */
export const PORT_SNAP_PX = GRID_UNIT * 2;

/** Hit-test tolerance for finding the wire under the dragged endpoint. */
export const HIT_TOLERANCE_PX = GRID_UNIT;

/** Grid the previewed split point snaps to. */
export const SNAP_GRID_PX = GRID_UNIT;
