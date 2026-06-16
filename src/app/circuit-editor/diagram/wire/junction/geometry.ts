// Pure geometry + port-selection helpers for the junction topology service.
// Builds the junction node, seeds its ports, and picks which side each incident
// wire should leave from.

import { NgDiagramModelService, type Edge, type Node, type Point, type Port } from 'ng-diagram';
import { endpointWorldPosition } from './topology/cleanup';
import {
  JUNCTION_NODE_TYPE,
  JUNCTION_PORT_IDS,
  JUNCTION_SIZE_PX,
  pickBranchJunctionPortId,
  type JunctionNodeData,
  type JunctionPortId,
} from './model';

export function junctionWorldCentre(junction: Node): Point {
  const size = junction.size ?? { width: JUNCTION_SIZE_PX, height: JUNCTION_SIZE_PX };
  return {
    x: junction.position.x + size.width / 2,
    y: junction.position.y + size.height / 2,
  };
}

export function junctionNodeAt(world: Point, id: string) {
  const half = JUNCTION_SIZE_PX / 2;
  return {
    id,
    type: JUNCTION_NODE_TYPE,
    position: { x: world.x - half, y: world.y - half },
    size: { width: JUNCTION_SIZE_PX, height: JUNCTION_SIZE_PX },
    autoSize: false,
    resizable: false,
    rotatable: false,
    data: { kind: 'junction' } satisfies JunctionNodeData,
    // Seed the four ports so a manual split-half anchoring here resolves on
    // frame 1. ng-diagram skips its port-init wait for manual edges, so without
    // this it logs "Invalid edge coordinates" until the junction is DOM-measured.
    // Positions match junctionPortWorld; the re-measure lands on the same spots.
    measuredPorts: junctionMeasuredPorts(id),
  } as const;
}

// Geometric port positions for a junction node: ports at the cardinal edge
// midpoints, size 0 so getPortPosition returns the exact edge point.
function junctionMeasuredPorts(nodeId: string): Port[] {
  const half = JUNCTION_SIZE_PX / 2;
  const full = JUNCTION_SIZE_PX;
  return [
    {
      id: JUNCTION_PORT_IDS.top,
      nodeId,
      type: 'both',
      side: 'top',
      position: { x: half, y: 0 },
      size: { width: 0, height: 0 },
    },
    {
      id: JUNCTION_PORT_IDS.right,
      nodeId,
      type: 'both',
      side: 'right',
      position: { x: full, y: half },
      size: { width: 0, height: 0 },
    },
    {
      id: JUNCTION_PORT_IDS.bottom,
      nodeId,
      type: 'both',
      side: 'bottom',
      position: { x: half, y: full },
      size: { width: 0, height: 0 },
    },
    {
      id: JUNCTION_PORT_IDS.left,
      nodeId,
      type: 'both',
      side: 'left',
      position: { x: 0, y: half },
      size: { width: 0, height: 0 },
    },
  ];
}

export function defaultHalfFallback(
  splitAxis: 'horizontal' | 'vertical',
  half: 'a' | 'b',
): JunctionPortId {
  if (splitAxis === 'horizontal') {
    return half === 'a' ? JUNCTION_PORT_IDS.left : JUNCTION_PORT_IDS.right;
  }
  return half === 'a' ? JUNCTION_PORT_IDS.top : JUNCTION_PORT_IDS.bottom;
}

function defaultBranchFallback(splitAxis: 'horizontal' | 'vertical'): JunctionPortId {
  return splitAxis === 'horizontal' ? JUNCTION_PORT_IDS.bottom : JUNCTION_PORT_IDS.right;
}

// Branch port perpendicular to splitAxis, skipping any port a half took. The
// opposite perpendicular is always free in current topology; the full scan is
// defensive. `branchOtherEnd` is null only for a degenerate edge with no
// resolvable far end, which `defaultBranchFallback` covers.
export function pickBranchPortAvoidingHalves(
  splitAxis: 'horizontal' | 'vertical',
  centre: Point,
  branchOtherEnd: Point | null,
  taken: ReadonlySet<JunctionPortId>,
): JunctionPortId {
  const preferred = branchOtherEnd
    ? pickBranchJunctionPortId(splitAxis, centre, branchOtherEnd)
    : defaultBranchFallback(splitAxis);
  if (!taken.has(preferred)) return preferred;
  const opposite = oppositePort(preferred);
  if (!taken.has(opposite)) return opposite;
  for (const port of [
    JUNCTION_PORT_IDS.top,
    JUNCTION_PORT_IDS.right,
    JUNCTION_PORT_IDS.bottom,
    JUNCTION_PORT_IDS.left,
  ]) {
    if (!taken.has(port)) return port;
  }
  return preferred;
}

function oppositePort(port: JunctionPortId): JunctionPortId {
  switch (port) {
    case JUNCTION_PORT_IDS.top:
      return JUNCTION_PORT_IDS.bottom;
    case JUNCTION_PORT_IDS.bottom:
      return JUNCTION_PORT_IDS.top;
    case JUNCTION_PORT_IDS.left:
      return JUNCTION_PORT_IDS.right;
    case JUNCTION_PORT_IDS.right:
      return JUNCTION_PORT_IDS.left;
  }
}

// Centre offset by half the junction size along the port's axis.
export function junctionPortWorld(centre: Point, port: JunctionPortId): Point {
  const half = JUNCTION_SIZE_PX / 2;
  switch (port) {
    case JUNCTION_PORT_IDS.top:
      return { x: centre.x, y: centre.y - half };
    case JUNCTION_PORT_IDS.right:
      return { x: centre.x + half, y: centre.y };
    case JUNCTION_PORT_IDS.bottom:
      return { x: centre.x, y: centre.y + half };
    case JUNCTION_PORT_IDS.left:
      return { x: centre.x - half, y: centre.y };
  }
}

export function otherEndWorld(
  modelService: NgDiagramModelService,
  edge: Edge,
  side: 'source' | 'target',
): Point | null {
  return side === 'target'
    ? endpointWorldPosition(modelService, edge.source, edge.sourcePosition)
    : endpointWorldPosition(modelService, edge.target, edge.targetPosition);
}
