// Keep manual-routed wires (reshaped, or junction halves) attached to their
// ports when a connected node moves. ng-diagram only re-routes `auto` edges on a
// move, so a reshaped wire would otherwise stay frozen and detach. This projects
// the manual polyline onto the live endpoint(s), preserving the user's interior
// bends, inserting an L-bend only when a straight stretch can't stay orthogonal.

import type { Edge, NgDiagramModelService, Point } from 'ng-diagram';
import { portWorldPosition } from '../../geometry';
import { collapseCollinearBends } from '../../geometry';
import { STRETCH_TOLERANCE_PX } from './config';

const TOL = STRETCH_TOLERANCE_PX;

// Re-anchor manual edges incident to a moved node to the live port positions.
// `candidateEdges` is the pre-filtered set of edges incident to the moved nodes
// (from the connectivity index), so this no longer scans the whole edge set.
export function applyEdgeStretchOnSelectionMoved(
  modelService: NgDiagramModelService,
  candidateEdges: readonly Edge[],
): void {
  if (candidateEdges.length === 0) return;
  const patches: { id: string; points: Point[] }[] = [];

  for (const edge of candidateEdges) {
    if (edge.routingMode !== 'manual') continue;
    if (!edge.points || edge.points.length < 2) continue;

    const liveSource = liveEndpointWorld(
      modelService,
      edge.source,
      edge.sourcePort,
      edge.sourcePosition,
    );
    const liveTarget = liveEndpointWorld(
      modelService,
      edge.target,
      edge.targetPort,
      edge.targetPosition,
    );
    const oldSource = edge.points[0];
    const oldTarget = edge.points[edge.points.length - 1];

    const sourceDrifted =
      !!liveSource &&
      (Math.abs(liveSource.x - oldSource.x) > 0.5 || Math.abs(liveSource.y - oldSource.y) > 0.5);
    const targetDrifted =
      !!liveTarget &&
      (Math.abs(liveTarget.x - oldTarget.x) > 0.5 || Math.abs(liveTarget.y - oldTarget.y) > 0.5);
    if (!sourceDrifted && !targetDrifted) continue;

    const stretched = stretchPolylineWithBendInsertion(
      edge.points,
      sourceDrifted ? liveSource : null,
      targetDrifted ? liveTarget : null,
    );
    if (stretched) {
      patches.push({ id: edge.id, points: stretched });
    } else {
      // Can't stay orthogonal: re-anchor the drifted end(s) rather than discard
      // the reshape by flipping to auto.
      const kept = edge.points.map((p) => ({ x: p.x, y: p.y }));
      if (sourceDrifted && liveSource) kept[0] = { x: liveSource.x, y: liveSource.y };
      if (targetDrifted && liveTarget) kept[kept.length - 1] = { x: liveTarget.x, y: liveTarget.y };
      patches.push({ id: edge.id, points: kept });
    }
  }

  if (patches.length > 0) modelService.updateEdges(patches);
}

function liveEndpointWorld(
  modelService: NgDiagramModelService,
  nodeId: string,
  portId: string | undefined,
  fallback: Point | undefined,
): Point | null {
  if (nodeId && portId) {
    const node = modelService.getNodeById(nodeId);
    return portWorldPosition(node ?? null, portId);
  }
  return fallback ? { x: fallback.x, y: fallback.y } : null;
}

// Project an orthogonal polyline onto new endpoints, preserving interior bends.
// Equal endpoint deltas → rigid translation; otherwise each moved end slides the
// touching bend along its cross-axis. Null when the result can't stay orthogonal.
export function stretchPolyline(
  points: readonly Point[],
  newSource: Point | null,
  newTarget: Point | null,
): Point[] | null {
  if (points.length < 2) return null;
  if (!newSource && !newTarget) return points.map((p) => ({ x: p.x, y: p.y }));

  if (newSource && newTarget) {
    const lastIdx = points.length - 1;
    const dxS = newSource.x - points[0].x;
    const dyS = newSource.y - points[0].y;
    const dxT = newTarget.x - points[lastIdx].x;
    const dyT = newTarget.y - points[lastIdx].y;
    if (Math.abs(dxS - dxT) < TOL && Math.abs(dyS - dyT) < TOL) {
      return points.map((p) => ({ x: p.x + dxS, y: p.y + dyS }));
    }
  }

  const result: Point[] = points.map((p) => ({ x: p.x, y: p.y }));

  if (newSource) {
    result[0] = { x: newSource.x, y: newSource.y };
    if (result.length > 2) {
      const adjacent = result[1];
      const oldSource = points[0];
      const horizontal = Math.abs(oldSource.y - adjacent.y) < TOL;
      const vertical = Math.abs(oldSource.x - adjacent.x) < TOL;
      if (horizontal) result[1] = { x: adjacent.x, y: newSource.y };
      else if (vertical) result[1] = { x: newSource.x, y: adjacent.y };
      else return null;
    }
  }

  if (newTarget) {
    const lastIdx = result.length - 1;
    result[lastIdx] = { x: newTarget.x, y: newTarget.y };
    if (result.length > 2) {
      const adjacent = result[lastIdx - 1];
      const oldTarget = points[lastIdx];
      const horizontal = Math.abs(oldTarget.y - adjacent.y) < TOL;
      const vertical = Math.abs(oldTarget.x - adjacent.x) < TOL;
      if (horizontal) result[lastIdx - 1] = { x: adjacent.x, y: newTarget.y };
      else if (vertical) result[lastIdx - 1] = { x: newTarget.x, y: adjacent.y };
      else return null;
    }
  }

  for (let i = 0; i < result.length - 1; i++) {
    const sameX = Math.abs(result[i].x - result[i + 1].x) < TOL;
    const sameY = Math.abs(result[i].y - result[i + 1].y) < TOL;
    if (!sameX && !sameY) return null;
  }
  return result;
}

// Like stretchPolyline, but inserts at most one L-bend at each drifted end when a
// strict stretch can't preserve the interior bends.
export function stretchPolylineWithBendInsertion(
  points: readonly Point[],
  newSource: Point | null,
  newTarget: Point | null,
): Point[] | null {
  if (points.length < 2) return null;
  if (!newSource && !newTarget)
    return collapseCollinearBends(points.map((p) => ({ x: p.x, y: p.y })));

  const strict = stretchPolyline(points, newSource, newTarget);
  if (strict) return collapseCollinearBends(strict);

  let working: Point[] = points.map((p) => ({ x: p.x, y: p.y }));
  if (newSource) {
    const next = insertSourceBend(working, newSource);
    if (!next) return null;
    working = next;
  }
  if (newTarget) {
    const next = insertTargetBend(working, newTarget);
    if (!next) return null;
    working = next;
  }

  for (let i = 0; i < working.length - 1; i++) {
    const sameX = Math.abs(working[i].x - working[i + 1].x) < TOL;
    const sameY = Math.abs(working[i].y - working[i + 1].y) < TOL;
    if (!sameX && !sameY) return null;
  }
  return collapseCollinearBends(working);
}

function insertSourceBend(points: readonly Point[], newSource: Point): Point[] | null {
  const sourcePoint = points[0];
  const nextPoint = points[1];
  const wasVertical = Math.abs(sourcePoint.x - nextPoint.x) < TOL;
  const wasHorizontal = Math.abs(sourcePoint.y - nextPoint.y) < TOL;
  if (!wasVertical && !wasHorizontal) return null;

  const tail = points.slice(1).map((p) => ({ x: p.x, y: p.y }));
  if (wasVertical) {
    if (Math.abs(newSource.x - nextPoint.x) < TOL)
      return [{ x: newSource.x, y: newSource.y }, ...tail];
    return [{ x: newSource.x, y: newSource.y }, { x: nextPoint.x, y: newSource.y }, ...tail];
  }
  if (Math.abs(newSource.y - nextPoint.y) < TOL)
    return [{ x: newSource.x, y: newSource.y }, ...tail];
  return [{ x: newSource.x, y: newSource.y }, { x: newSource.x, y: nextPoint.y }, ...tail];
}

function insertTargetBend(points: readonly Point[], newTarget: Point): Point[] | null {
  const lastIdx = points.length - 1;
  const targetPoint = points[lastIdx];
  const prevPoint = points[lastIdx - 1];
  const wasVertical = Math.abs(targetPoint.x - prevPoint.x) < TOL;
  const wasHorizontal = Math.abs(targetPoint.y - prevPoint.y) < TOL;
  if (!wasVertical && !wasHorizontal) return null;

  const head = points.slice(0, lastIdx).map((p) => ({ x: p.x, y: p.y }));
  if (wasVertical) {
    if (Math.abs(newTarget.x - prevPoint.x) < TOL)
      return [...head, { x: newTarget.x, y: newTarget.y }];
    return [...head, { x: prevPoint.x, y: newTarget.y }, { x: newTarget.x, y: newTarget.y }];
  }
  if (Math.abs(newTarget.y - prevPoint.y) < TOL)
    return [...head, { x: newTarget.x, y: newTarget.y }];
  return [...head, { x: newTarget.x, y: prevPoint.y }, { x: newTarget.x, y: newTarget.y }];
}
