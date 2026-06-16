// Tunables for the branch-from-wire (link-to-link) feature.

import { GRID_UNIT } from '../../../model/component-catalog';

/** Drag distance before a press on the indicator becomes a branch (vs a click that selects the wire). */
export const BRANCH_THRESHOLD_PX = 4;

/** Cursor-to-port snap distance on release — mirrors ng-diagram's default link snap. */
export const PORT_SNAP_PX = GRID_UNIT * 2;

/** Hit-test tolerance for finding the wire under the cursor. */
export const HIT_TOLERANCE_PX = GRID_UNIT;

/** Grid the branch start point snaps to. */
export const SNAP_GRID_PX = GRID_UNIT;
