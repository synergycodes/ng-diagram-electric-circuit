// Fold redundant bend vertices out of an orthogonal polyline. Used after a
// reshape drag so collinear / quasi-collinear seams don't survive as ghost
// handles or stray corners.

import type { Point } from 'ng-diagram';
import { POSITION_TOLERANCE_PX } from './geometry';

const COLLINEAR_TOL = POSITION_TOLERANCE_PX;

// Drop interior vertices whose neighbours are strictly collinear (same axis,
// pass-through, not a U-turn).
export function collapseCollinearBends(points: readonly Point[]): Point[] {
  if (points.length < 3) return points.map((p) => ({ x: p.x, y: p.y }));
  const result: Point[] = [{ x: points[0].x, y: points[0].y }];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const collinearX =
      Math.abs(prev.x - curr.x) < COLLINEAR_TOL &&
      Math.abs(curr.x - next.x) < COLLINEAR_TOL &&
      isBetween(prev.y, curr.y, next.y);
    const collinearY =
      Math.abs(prev.y - curr.y) < COLLINEAR_TOL &&
      Math.abs(curr.y - next.y) < COLLINEAR_TOL &&
      isBetween(prev.x, curr.x, next.x);
    if (collinearX || collinearY) continue;
    result.push({ x: curr.x, y: curr.y });
  }
  result.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
  return result;
}

// `b` within [a, c] (either order), with tolerance — pass-through vs U-turn.
function isBetween(a: number, b: number, c: number): boolean {
  return b >= Math.min(a, c) - COLLINEAR_TOL && b <= Math.max(a, c) + COLLINEAR_TOL;
}

// Drop interior points whose incoming/outgoing segments share a dominant axis.
// Looser than collapseCollinearBends — catches quasi-collinear 3-point
// polylines with misaligned coords. L corners stay.
export function dropSameAxisBends(points: readonly Point[]): Point[] {
  if (points.length < 3) return points.map((p) => ({ x: p.x, y: p.y }));
  const result: Point[] = [{ x: points[0].x, y: points[0].y }];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const incomingAxis: 'h' | 'v' =
      Math.abs(curr.x - prev.x) > Math.abs(curr.y - prev.y) ? 'h' : 'v';
    const outgoingAxis: 'h' | 'v' =
      Math.abs(next.x - curr.x) > Math.abs(next.y - curr.y) ? 'h' : 'v';
    if (incomingAxis === outgoingAxis) continue;
    result.push({ x: curr.x, y: curr.y });
  }
  result.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
  return result;
}
