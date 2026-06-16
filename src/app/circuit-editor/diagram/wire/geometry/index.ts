// Pure orthogonal-polyline geometry shared by every wire interaction: point
// comparison, port world position, edge-split hit testing, and bend folding.
// Depends on nothing else in wire/ — the bottom of the dependency graph.

export {
  POSITION_TOLERANCE_PX,
  samePoint,
  segmentAxis,
  portWorldPosition,
  findEdgeSplitHit,
  splitPolylineAt,
  type EdgeSplitHit,
} from './geometry';
export { collapseCollinearBends, dropSameAxisBends } from './bend-collapse';
