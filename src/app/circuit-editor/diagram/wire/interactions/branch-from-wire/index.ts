// Branch-from-wire (link-to-link) feature: a hover affordance on an unselected
// wire that, when dragged, splits the wire into a junction and pulls out a new
// branch. Entry point: BranchFromWireOverlayComponent. Depends only on wire/geometry
// and wire/junction — never on a sibling interaction.

export { BranchFromWireOverlayComponent } from './branch-from-wire-overlay.component';
export * from './config';
