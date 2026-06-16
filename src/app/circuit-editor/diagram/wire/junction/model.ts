// Junction node identity, geometry constants, and id minting.
//
// A junction is the schematic "solder dot": an 8-px node materialised where a
// wire is dropped onto another wire. It has four cardinal ports so the wire
// halves and the new branch each leave from the side facing their far end,
// which keeps the orthogonal router from converging them into an overlap.

import type { Node, Point } from 'ng-diagram';

/** ng-diagram node `type` for a wire junction (link-to-link split point). */
export const JUNCTION_NODE_TYPE = 'junction';

/** One grid cell. Ports sit 4 px from the centre. */
export const JUNCTION_SIZE_PX = 8;

/** Four port sides at the junction centre. */
export const JUNCTION_PORT_IDS = {
  top: 'p-top',
  right: 'p-right',
  bottom: 'p-bottom',
  left: 'p-left',
} as const;

export type JunctionPortId = (typeof JUNCTION_PORT_IDS)[keyof typeof JUNCTION_PORT_IDS];

/** Junctions carry no payload yet; the discriminant keeps the data shape typed. */
export interface JunctionNodeData {
  readonly kind: 'junction';
}

export function isJunctionNode(node: Node | null | undefined): node is Node<JunctionNodeData> {
  return !!node && node.type === JUNCTION_NODE_TYPE;
}

export function junctionCentre(position: Point): Point {
  return {
    x: position.x + JUNCTION_SIZE_PX / 2,
    y: position.y + JUNCTION_SIZE_PX / 2,
  };
}

/** Pick the port facing `towards` by dominant axis. */
export function pickJunctionPortId(centre: Point, towards: Point): JunctionPortId {
  const dx = towards.x - centre.x;
  const dy = towards.y - centre.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? JUNCTION_PORT_IDS.right : JUNCTION_PORT_IDS.left;
  }
  return dy >= 0 ? JUNCTION_PORT_IDS.bottom : JUNCTION_PORT_IDS.top;
}

/**
 * Branch port at a split: perpendicular to the split segment's axis, on the
 * side matching the branch's far end.
 */
export function pickBranchJunctionPortId(
  segmentAxis: 'horizontal' | 'vertical',
  centre: Point,
  branchOtherEnd: Point,
): JunctionPortId {
  if (segmentAxis === 'horizontal') {
    return branchOtherEnd.y >= centre.y ? JUNCTION_PORT_IDS.bottom : JUNCTION_PORT_IDS.top;
  }
  return branchOtherEnd.x >= centre.x ? JUNCTION_PORT_IDS.right : JUNCTION_PORT_IDS.left;
}

// Type-prefixed ids so a model dump reveals the kind of object at a glance —
// ng-diagram is type-blind at the id level.
export function mintWireId(): string {
  return `wire-${crypto.randomUUID()}`;
}

export function mintJunctionId(): string {
  return `junction-${crypto.randomUUID()}`;
}

/** Lives inside `edge.data`, not as an id field — unprefixed. */
export function mintFormerParentId(): string {
  return crypto.randomUUID();
}
