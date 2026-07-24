import { DxfLwPolyline } from '../dxf/dxf-entity';
import type { DxfEdgeRenderer } from '../dxf/dxf-types';
import { LAYERS, LINE_WEIGHT } from './circuit-dxf-constants';

/**
 * Emits a single LWPOLYLINE per wire edge from `edge.points`.
 *
 * `edge.points` is supplied by ng-diagram after routing (orthogonal here), with
 * the first/last point sitting on the connected port's measured anchor — the
 * same anchors the component renderer aligns its symbol box to — so wires meet
 * component terminals exactly, with no endpoint adjustment needed.
 */
export const renderWireEdge: DxfEdgeRenderer = (ctx, edge) => {
  const points = edge.points ?? [];
  if (points.length < 2) return;

  const mapped = points.map((point) => ctx.mapper.mapPoint(point.x, point.y));
  ctx.doc.addEntity(new DxfLwPolyline(LAYERS.WIRES, mapped, false, undefined, LINE_WEIGHT.WIRE));
};
