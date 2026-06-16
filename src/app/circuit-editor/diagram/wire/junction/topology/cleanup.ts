// Post-mutation junction fixup. After a delete or relink changes how many wires
// meet at a junction, classify by branch count: 0 -> delete the orphan; 2 ->
// merge the two halves back into one wire and drop the node; 1 or 3+ -> leave.

import type { Edge, NgDiagramModelService, NgDiagramService, Point } from 'ng-diagram';
import { WIRE_EDGE_TYPE, type CircuitEdgeData } from '../../../model/component-types';
import { POSITION_TOLERANCE_PX, portWorldPosition } from '../../geometry';
import { isJunctionNode, mintWireId } from '../model';

// Bbox-centre approximation — good enough to classify a port's direction.
export function endpointWorldPosition(
  modelService: NgDiagramModelService,
  nodeId: string,
  position: Point | undefined,
): Point | null {
  if (nodeId === '') return position ?? null;
  const node = modelService.getNodeById(nodeId);
  if (!node) return null;
  const size = node.size ?? { width: 0, height: 0 };
  return {
    x: node.position.x + size.width / 2,
    y: node.position.y + size.height / 2,
  };
}

export function reconcileJunction(
  modelService: NgDiagramModelService,
  ngDiagramService: NgDiagramService,
  junctionId: string,
): void {
  reconcileJunctions(modelService, ngDiagramService, [junctionId]);
}

// Reconcile several junctions and apply every change in ONE transaction. Doing
// each merge in its own transaction within a tight loop collides — ng-diagram
// batches them and only the first lands. Plans are computed from the current
// (committed) model up front; junction halves are disjoint, so this is safe.
export function reconcileJunctions(
  modelService: NgDiagramModelService,
  ngDiagramService: NgDiagramService,
  junctionIds: readonly string[],
): void {
  const edges = modelService.edges();
  const deleteEdgeIds: string[] = [];
  const deleteNodeIds: string[] = [];
  const addSpecs: ReturnType<typeof buildMergedWire>[] = [];

  for (const junctionId of junctionIds) {
    if (!junctionId) continue;
    if (!isJunctionNode(modelService.getNodeById(junctionId))) continue;
    // Count from the authoritative edges() signal rather than getConnectedEdges,
    // whose adjacency cache can lag a just-applied delete.
    const connected = edges.filter((e) => e.source === junctionId || e.target === junctionId);
    if (connected.length === 0) {
      deleteNodeIds.push(junctionId);
    } else if (connected.length === 2) {
      deleteEdgeIds.push(connected[0].id, connected[1].id);
      deleteNodeIds.push(junctionId);
      addSpecs.push(buildMergedWire(modelService, junctionId, connected[0], connected[1]));
    }
  }

  if (deleteNodeIds.length === 0 && addSpecs.length === 0) return;
  ngDiagramService.transaction(() => {
    if (deleteEdgeIds.length) modelService.deleteEdges(deleteEdgeIds);
    if (deleteNodeIds.length) modelService.deleteNodes(deleteNodeIds);
    if (addSpecs.length) modelService.addEdges(addSpecs);
  });
}

// Delete the junction and its two halves, replacing them with a single wire that
// spans both far ends. Operates on the passed half edges (no re-read), so it's
// safe to call right after deleting a sibling branch in the same tick.
export function mergeJunctionHalves(
  modelService: NgDiagramModelService,
  ngDiagramService: NgDiagramService,
  junctionId: string,
  firstHalf: Edge,
  secondHalf: Edge,
): void {
  const merged = buildMergedWire(modelService, junctionId, firstHalf, secondHalf);
  ngDiagramService.transaction(() => {
    modelService.deleteEdges([firstHalf.id, secondHalf.id]);
    modelService.deleteNodes([junctionId]);
    modelService.addEdges([merged]);
  });
}

// Build (without mutating) the wire that replaces a junction's two halves.
function buildMergedWire(
  modelService: NgDiagramModelService,
  junctionId: string,
  firstHalf: Edge,
  secondHalf: Edge,
) {
  const firstOtherEnd =
    firstHalf.source === junctionId
      ? { id: firstHalf.target, port: firstHalf.targetPort, position: firstHalf.targetPosition }
      : { id: firstHalf.source, port: firstHalf.sourcePort, position: firstHalf.sourcePosition };
  const secondOtherEnd =
    secondHalf.source === junctionId
      ? { id: secondHalf.target, port: secondHalf.targetPort, position: secondHalf.targetPosition }
      : { id: secondHalf.source, port: secondHalf.sourcePort, position: secondHalf.sourcePosition };

  // Compose the polyline manually — auto routing can leave quasi-collinear
  // bends within tolerance that surface as ghost handles.
  const srcWorld = endpointResolvedWorld(modelService, firstOtherEnd);
  const tgtWorld = endpointResolvedWorld(modelService, secondOtherEnd);
  const mergedPoints = srcWorld && tgtWorld ? minimalOrthogonalPath(srcWorld, tgtWorld) : undefined;

  return {
    id: mintWireId(),
    type: WIRE_EDGE_TYPE,
    source: firstOtherEnd.id,
    sourcePort: firstOtherEnd.port,
    sourcePosition: firstOtherEnd.id === '' ? firstOtherEnd.position : undefined,
    target: secondOtherEnd.id,
    targetPort: secondOtherEnd.port,
    targetPosition: secondOtherEnd.id === '' ? secondOtherEnd.position : undefined,
    // 'manual' so the composed polyline isn't re-routed away.
    routingMode: mergedPoints ? ('manual' as const) : ('auto' as const),
    points: mergedPoints,
    data: { kind: 'wire' } satisfies CircuitEdgeData,
  };
}

function endpointResolvedWorld(
  modelService: NgDiagramModelService,
  end: { id: string; port: string | undefined; position: Point | undefined },
): Point | null {
  if (end.id === '') return end.position ?? null;
  if (!end.port) return null;
  const node = modelService.getNodeById(end.id);
  return portWorldPosition(node ?? null, end.port);
}

// 2-point segment for axis-aligned ports, L (vertical-first) for misaligned.
function minimalOrthogonalPath(src: Point, tgt: Point): Point[] {
  const sameX = Math.abs(src.x - tgt.x) < POSITION_TOLERANCE_PX;
  const sameY = Math.abs(src.y - tgt.y) < POSITION_TOLERANCE_PX;
  if (sameX || sameY) {
    return [
      { x: src.x, y: src.y },
      { x: tgt.x, y: tgt.y },
    ];
  }
  return [
    { x: src.x, y: src.y },
    { x: src.x, y: tgt.y },
    { x: tgt.x, y: tgt.y },
  ];
}
