// Pure polyline math for the reshape overlay: enumerate draggable segments and
// recompute a polyline when one segment is dragged perpendicular to its axis.

import type { Point } from 'ng-diagram';
import { POSITION_TOLERANCE_PX } from '../../geometry';

export type EndpointKind = 'port' | 'junction' | 'dangling';

export interface ReshapeSegment {
  readonly segmentIndex: number;
  readonly midpoint: Point;
  readonly axis: 'horizontal' | 'vertical';
  readonly propagateToJunction: 'source' | 'target' | null;
  readonly anchorPortAtSource: boolean;
  readonly anchorPortAtTarget: boolean;
}

// One handle per orthogonal segment; degenerate (diagonal/zero-length) skipped.
export function findReshapeableSegments(
  points: readonly Point[] | undefined,
  sourceKind: EndpointKind,
  targetKind: EndpointKind,
): ReshapeSegment[] {
  const segments: ReshapeSegment[] = [];
  if (!points || points.length < 2) return segments;
  const lastSegmentIndex = points.length - 2;
  for (let i = 0; i <= lastSegmentIndex; i++) {
    const segStart = points[i];
    const segEnd = points[i + 1];
    const horizontal = Math.abs(segStart.y - segEnd.y) < POSITION_TOLERANCE_PX;
    const vertical = Math.abs(segStart.x - segEnd.x) < POSITION_TOLERANCE_PX;
    if (horizontal === vertical) continue;
    const isFirst = i === 0;
    const isLast = i === lastSegmentIndex;
    const propagateToJunction: 'source' | 'target' | null =
      isFirst && sourceKind === 'junction'
        ? 'source'
        : isLast && targetKind === 'junction'
          ? 'target'
          : null;
    segments.push({
      segmentIndex: i,
      midpoint: { x: (segStart.x + segEnd.x) / 2, y: (segStart.y + segEnd.y) / 2 },
      axis: horizontal ? 'horizontal' : 'vertical',
      propagateToJunction,
      anchorPortAtSource: isFirst && sourceKind === 'port',
      anchorPortAtTarget: isLast && targetKind === 'port',
    });
  }
  return segments;
}

function reshapeSegment(
  points: readonly Point[],
  segmentIndex: number,
  axis: 'horizontal' | 'vertical',
  dxWorld: number,
  dyWorld: number,
  gridPx: number,
): Point[] {
  const result = points.map((p) => ({ ...p }));
  const segStart = result[segmentIndex];
  const segEnd = result[segmentIndex + 1];
  if (axis === 'horizontal') {
    const snapped = Math.round((segStart.y + dyWorld) / gridPx) * gridPx;
    segStart.y = snapped;
    segEnd.y = snapped;
  } else {
    const snapped = Math.round((segStart.x + dxWorld) / gridPx) * gridPx;
    segStart.x = snapped;
    segEnd.x = snapped;
  }
  return result;
}

// Reshape with optional L-bend insertion at port-anchored ends so the port stays put.
export function reshapeAnchoredSegment(
  initialPoints: readonly Point[],
  segmentIndex: number,
  axis: 'horizontal' | 'vertical',
  dxWorld: number,
  dyWorld: number,
  gridPx: number,
  anchorSource: boolean,
  anchorTarget: boolean,
): Point[] {
  const shifted = reshapeSegment(initialPoints, segmentIndex, axis, dxWorld, dyWorld, gridPx);
  const lastIndex = shifted.length - 1;
  const willAnchorSource = anchorSource && segmentIndex === 0;
  const willAnchorTarget = anchorTarget && segmentIndex + 1 === lastIndex;
  if (!willAnchorSource && !willAnchorTarget) return shifted;

  let result: Point[] = shifted;

  // Process target-end first so the source-end splice doesn't shift indices.
  if (willAnchorTarget) {
    const origTarget = initialPoints[lastIndex];
    const newPerp = axis === 'horizontal' ? shifted[lastIndex].y : shifted[lastIndex].x;
    const elbow: Point =
      axis === 'horizontal' ? { x: origTarget.x, y: newPerp } : { x: newPerp, y: origTarget.y };
    result = [...result.slice(0, lastIndex), elbow, { x: origTarget.x, y: origTarget.y }];
  }

  if (willAnchorSource) {
    const origSource = initialPoints[0];
    const newPerp = axis === 'horizontal' ? shifted[0].y : shifted[0].x;
    const elbow: Point =
      axis === 'horizontal' ? { x: origSource.x, y: newPerp } : { x: newPerp, y: origSource.y };
    result = [{ x: origSource.x, y: origSource.y }, elbow, ...result.slice(1)];
  }

  return result;
}

// Orthogonal axis of the end-segment, or null if oblique / too short.
export function neighborAxis(
  points: readonly Point[],
  side: 'source' | 'target',
): 'horizontal' | 'vertical' | null {
  if (points.length < 2) return null;
  const endIdx = side === 'source' ? 0 : points.length - 1;
  const neighborIdx = side === 'source' ? 1 : points.length - 2;
  const end = points[endIdx];
  const neighbor = points[neighborIdx];
  const sameX = Math.abs(end.x - neighbor.x) < POSITION_TOLERANCE_PX;
  const sameY = Math.abs(end.y - neighbor.y) < POSITION_TOLERANCE_PX;
  if (sameX && !sameY) return 'vertical';
  if (sameY && !sameX) return 'horizontal';
  return null;
}

// Snap the anchored end-point's neighbour onto the captured axis to undo
// sub-pixel port drift. No-op for oblique end-segments.
export function realignEndpointNeighbor(
  points: Point[],
  side: 'source' | 'target',
  axis: 'horizontal' | 'vertical' | null,
): void {
  if (axis === null) return;
  if (points.length < 2) return;
  const endIdx = side === 'source' ? 0 : points.length - 1;
  const neighborIdx = side === 'source' ? 1 : points.length - 2;
  if (axis === 'vertical') {
    points[neighborIdx].x = points[endIdx].x;
  } else {
    points[neighborIdx].y = points[endIdx].y;
  }
}

// Replace each oblique segment with a vertical-first L-bend. The pointer-up
// collapse later folds any bend that turns out collinear.
export function orthogonalizePolyline(points: readonly Point[]): Point[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));
  const result: Point[] = [{ x: points[0].x, y: points[0].y }];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const sameX = Math.abs(prev.x - curr.x) < POSITION_TOLERANCE_PX;
    const sameY = Math.abs(prev.y - curr.y) < POSITION_TOLERANCE_PX;
    if (sameX || sameY) {
      result.push({ x: curr.x, y: curr.y });
      continue;
    }
    result.push({ x: prev.x, y: curr.y });
    result.push({ x: curr.x, y: curr.y });
  }
  return result;
}
