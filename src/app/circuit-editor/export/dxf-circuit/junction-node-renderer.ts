import type { Point } from 'ng-diagram';
// Import the pure model directly (not the junction barrel, which re-exports an
// Angular component) so this serialization path stays framework-free.
import { JUNCTION_SIZE_PX, junctionCentre } from '../../diagram/wire/junction/model';
import { DxfLwPolyline } from '../dxf/dxf-entity';
import type { DxfNodeRenderer } from '../dxf/dxf-types';
import { LAYERS, LINE_WEIGHT } from './circuit-dxf-constants';

const JUNCTION_SEGMENTS = 16;

/**
 * Renders a wire junction (the schematic solder dot) as a small closed polygon
 * approximating the filled circle drawn on canvas and in the SVG export. The
 * dot sits on the WIRES layer since it is part of the wiring, not a component.
 */
export const renderJunctionNode: DxfNodeRenderer = (ctx, node) => {
  const centre = junctionCentre(node.position);
  const radius = JUNCTION_SIZE_PX / 2;

  const points: Point[] = [];
  for (let i = 0; i < JUNCTION_SEGMENTS; i++) {
    const t = (i / JUNCTION_SEGMENTS) * 2 * Math.PI;
    const world = { x: centre.x + radius * Math.cos(t), y: centre.y + radius * Math.sin(t) };
    points.push(ctx.mapper.mapPoint(world.x, world.y));
  }

  ctx.doc.addEntity(new DxfLwPolyline(LAYERS.WIRES, points, true, undefined, LINE_WEIGHT.JUNCTION));
};
