// Junction port reassignment — pure logic for the matching middleware. Prevents
// two wires from leaving the same junction port collinear (visible overlap).

import type { Edge, Point } from 'ng-diagram';
import { type CircuitEdgeData } from '../model/component-types';
import { JUNCTION_PORT_IDS, type JunctionPortId } from './junction-model';

export interface BranchEndpoint {
  readonly edgeId: string;
  readonly side: 'source' | 'target';
  readonly currentPort: JunctionPortId;
  readonly otherEndWorld: Point;
  // Parent-halves keep their port; fresh branches yield.
  readonly formerParentId?: string;
}

// Index every junction-incident wire under its junction in one edge pass (O(E)).
// A junction-to-junction wire registers under both ends; a self-loop only on its
// source side.
export function collectBranchesByJunction(
  junctionIds: ReadonlySet<string>,
  edges: readonly Edge[],
  resolveOtherEnd: (nodeId: string, position: Point | undefined) => Point | null,
): Map<string, BranchEndpoint[]> {
  const byJunction = new Map<string, BranchEndpoint[]>();
  const push = (junctionId: string, branch: BranchEndpoint): void => {
    const list = byJunction.get(junctionId);
    if (list) list.push(branch);
    else byJunction.set(junctionId, [branch]);
  };

  for (const edge of edges) {
    // Skip manual edges — changing the port would orphan the polyline.
    if (edge.routingMode === 'manual' && edge.points && edge.points.length > 0) continue;
    const formerParentId = (edge.data as CircuitEdgeData | undefined)?.formerParentId;

    if (junctionIds.has(edge.source) && edge.sourcePort) {
      const otherEnd = resolveOtherEnd(edge.target, edge.targetPosition);
      if (otherEnd) {
        push(edge.source, {
          edgeId: edge.id,
          side: 'source',
          currentPort: edge.sourcePort as JunctionPortId,
          otherEndWorld: otherEnd,
          formerParentId,
        });
      }
    }
    if (junctionIds.has(edge.target) && edge.targetPort && edge.target !== edge.source) {
      const otherEnd = resolveOtherEnd(edge.source, edge.sourcePosition);
      if (otherEnd) {
        push(edge.target, {
          edgeId: edge.id,
          side: 'target',
          currentPort: edge.targetPort as JunctionPortId,
          otherEndWorld: otherEnd,
          formerParentId,
        });
      }
    }
  }

  return byJunction;
}

export interface BranchPortAssignment {
  readonly edgeId: string;
  readonly side: 'source' | 'target';
  readonly port: JunctionPortId;
}

// Minimal port-change diff: non-parent-half branches on an overcrowded port move
// to a perpendicular port. Skips when both cross-axis ports are busy. Idempotent.
export function reassignJunctionBranches(
  junctionCentre: Point,
  branches: readonly BranchEndpoint[],
): BranchPortAssignment[] {
  const portCounts: Record<JunctionPortId, number> = {
    [JUNCTION_PORT_IDS.top]: 0,
    [JUNCTION_PORT_IDS.right]: 0,
    [JUNCTION_PORT_IDS.bottom]: 0,
    [JUNCTION_PORT_IDS.left]: 0,
  };
  for (const b of branches) portCounts[b.currentPort]++;

  const changes: BranchPortAssignment[] = [];
  const allPorts: readonly JunctionPortId[] = [
    JUNCTION_PORT_IDS.top,
    JUNCTION_PORT_IDS.right,
    JUNCTION_PORT_IDS.bottom,
    JUNCTION_PORT_IDS.left,
  ];

  for (const port of allPorts) {
    if (portCounts[port] <= 1) continue;

    const onPort = branches.filter((b) => b.currentPort === port);
    const movable = onPort.filter((b) => b.formerParentId === undefined);
    if (movable.length === 0) continue;

    const hasParentHalf = onPort.length > movable.length;
    const toReassign = hasParentHalf ? movable : movable.slice(1);

    for (const branch of toReassign) {
      const primary = pickCrossAxisPort(port, junctionCentre, branch.otherEndWorld);
      const alt = oppositePort(primary);
      const target = portCounts[primary] === 0 ? primary : portCounts[alt] === 0 ? alt : null;
      if (target === null) continue;

      portCounts[port]--;
      portCounts[target]++;
      changes.push({ edgeId: branch.edgeId, side: branch.side, port: target });
    }
  }

  return changes;
}

function pickCrossAxisPort(
  overcrowdedPort: JunctionPortId,
  centre: Point,
  otherEnd: Point,
): JunctionPortId {
  if (overcrowdedPort === JUNCTION_PORT_IDS.left || overcrowdedPort === JUNCTION_PORT_IDS.right) {
    return otherEnd.y >= centre.y ? JUNCTION_PORT_IDS.bottom : JUNCTION_PORT_IDS.top;
  }
  return otherEnd.x >= centre.x ? JUNCTION_PORT_IDS.right : JUNCTION_PORT_IDS.left;
}

function oppositePort(p: JunctionPortId): JunctionPortId {
  switch (p) {
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
