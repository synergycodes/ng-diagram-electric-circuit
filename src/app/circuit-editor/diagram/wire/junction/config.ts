// Tunables for the junction domain (the solder-dot node + its topology ops).

import { GRID_UNIT } from '../../model/component-catalog';

/** Cursor-to-port snap distance on branch resolution — mirrors ng-diagram's default link snap. */
export const PORT_SNAP_PX = GRID_UNIT * 2;

/** Tolerance (px) for the drop-on-wire hit test that materialises a junction. */
export const SPLIT_HIT_TOLERANCE_PX = GRID_UNIT;

/** Grid the junction split point snaps to. */
export const SPLIT_SNAP_GRID_PX = GRID_UNIT;
