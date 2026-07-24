import type { Node, Point } from 'ng-diagram';
import {
  COMPONENT_CATALOG,
  getSymbolSize,
  REF_ROW_HEIGHT,
  VALUE_ROW_HEIGHT,
} from '../../diagram/model/component-catalog';
import type { CircuitNodeData, ComponentDefinition } from '../../diagram/model/component-types';
import { portWorldPosition } from '../../diagram/wire/geometry';
import { symbolBody } from '../../diagram/node/symbols/symbol-shapes';
import { DxfLwPolyline, DxfText } from '../dxf/dxf-entity';
import type { DxfNodeRenderer, DxfRenderContext } from '../dxf/dxf-types';
import {
  FONT_REFERENCE,
  FONT_VALUE,
  LAYERS,
  LINE_WEIGHT,
  TEXT_STYLE,
} from './circuit-dxf-constants';
import { flattenSvgBody } from './svg-symbol-flattener';

/**
 * Renders a circuit component node into DXF entities, mirroring what
 * `ExportService.exportSvg()` draws: the symbol body scaled into its
 * grid-snapped box (rotated with the node), the reference designator, and the
 * headline value.
 *
 * Symbol geometry comes from `symbolBody` — the same single source of truth the
 * on-canvas node and the SVG export use — flattened to polylines/text by
 * `flattenSvgBody`. The symbol box is derived from the live measured port
 * anchors (via `symbolBox`) so it lines up with the wires exactly the way the
 * SVG export does, falling back to the reserved-row layout before measurement.
 */
export const renderCircuitNode: DxfNodeRenderer = (ctx, node) => {
  const typedNode = node as Node<CircuitNodeData>;
  const data = typedNode.data;
  const def = COMPONENT_CATALOG[data.componentType];
  const symbol = getSymbolSize(def);
  const view = def.symbol;

  const nodeWidth = node.size?.width ?? symbol.width;
  const nodeHeight = node.size?.height ?? REF_ROW_HEIGHT + symbol.height;
  const centerX = nodeWidth / 2;
  const centerY = nodeHeight / 2;
  const angle = node.angle ?? 0;

  const { left: symLeft, top: symTop } = symbolBox(typedNode, def);
  const scaleX = symbol.width / view.width;
  const scaleY = symbol.height / view.height;

  // viewBox coordinate → world (flow) coordinate: place into the symbol box,
  // rotate about the node centre (labels stay upright, so this only wraps the
  // symbol), then offset by the node's world position.
  const toWorld = (vx: number, vy: number): Point => {
    const localX = symLeft + vx * scaleX;
    const localY = symTop + vy * scaleY;
    const rotated = rotate(localX, localY, centerX, centerY, angle);
    return { x: node.position.x + rotated.x, y: node.position.y + rotated.y };
  };

  const flat = flattenSvgBody(symbolBody(data.componentType));

  for (const polyline of flat.polylines) {
    const mapped = polyline.points.map((p) => {
      const world = toWorld(p.x, p.y);
      return ctx.mapper.mapPoint(world.x, world.y);
    });
    ctx.doc.addEntity(
      new DxfLwPolyline(LAYERS.COMPONENTS, mapped, polyline.closed, undefined, LINE_WEIGHT.SYMBOL),
    );
  }

  // Pin numbers inside IC symbols (e.g. the NE555). Height uses the vertical
  // scale — text can't stretch non-uniformly in DXF, and the pin labels sit in
  // the vertical run of pins where scaleY governs.
  for (const text of flat.texts) {
    const world = toWorld(text.x, text.y);
    const mapped = ctx.mapper.mapPoint(world.x, world.y);
    ctx.doc.addEntity(
      new DxfText(
        LAYERS.LABELS,
        text.text,
        mapped.x,
        mapped.y,
        ctx.mapper.mapLength(text.fontSize * scaleY),
        TEXT_STYLE.STANDARD,
        text.halign,
        2,
      ),
    );
  }

  renderLabels(ctx, typedNode, def, data, symLeft, symTop, symbol.width, symbol.height);
};

/**
 * Symbol-box rect within the node, derived from the live measured port anchors
 * so it lines up with the wires. Ported verbatim from `ExportService` so the
 * DXF and SVG exports place the symbol identically. Falls back to the
 * reserved-row layout when ports aren't measured yet.
 */
const symbolBox = (
  node: Node<CircuitNodeData>,
  def: ComponentDefinition,
): { left: number; top: number } => {
  const symbol = getSymbolSize(def);
  let sumLeft = 0;
  let sumTop = 0;
  let count = 0;
  for (const port of def.ports) {
    const anchor = portWorldPosition(node, port.id);
    if (!anchor) continue;
    sumLeft += anchor.x - node.position.x - port.cx * symbol.width;
    sumTop += anchor.y - node.position.y - port.cy * symbol.height;
    count++;
  }
  if (count === 0) {
    const width = node.size?.width ?? symbol.width;
    return {
      left: (width - symbol.width) / 2,
      top: REF_ROW_HEIGHT + (showValueAbove(def, node.data) ? VALUE_ROW_HEIGHT : 0),
    };
  }
  return { left: sumLeft / count, top: sumTop / count };
};

const renderLabels = (
  ctx: DxfRenderContext,
  node: Node<CircuitNodeData>,
  def: ComponentDefinition,
  data: CircuitNodeData,
  symLeft: number,
  symTop: number,
  symbolWidth: number,
  symbolHeight: number,
): void => {
  const cx = symLeft + symbolWidth / 2;

  if (showValueAbove(def, data)) {
    if (data.reference) {
      addLabel(
        ctx,
        node,
        cx,
        symTop - VALUE_ROW_HEIGHT - REF_ROW_HEIGHT / 2,
        data.reference,
        FONT_REFERENCE,
        TEXT_STYLE.BOLD,
      );
    }
    addLabel(
      ctx,
      node,
      cx,
      symTop - VALUE_ROW_HEIGHT / 2,
      data.value,
      FONT_VALUE,
      TEXT_STYLE.STANDARD,
    );
    return;
  }

  if (data.reference) {
    addLabel(
      ctx,
      node,
      cx,
      symTop - REF_ROW_HEIGHT / 2,
      data.reference,
      FONT_REFERENCE,
      TEXT_STYLE.BOLD,
    );
  }
  if (showValueBelow(def, data)) {
    addLabel(
      ctx,
      node,
      cx,
      symTop + symbolHeight + VALUE_ROW_HEIGHT / 2,
      data.value,
      FONT_VALUE,
      TEXT_STYLE.STANDARD,
    );
  }
};

// Labels are placed at their unrotated node-local positions (matching the SVG
// export, where labels stay upright outside the symbol's rotation group).
const addLabel = (
  ctx: DxfRenderContext,
  node: Node<CircuitNodeData>,
  localX: number,
  localY: number,
  text: string,
  fontSize: number,
  style: string,
): void => {
  if (!text) return;
  const mapped = ctx.mapper.mapPoint(node.position.x + localX, node.position.y + localY);
  ctx.doc.addEntity(
    new DxfText(
      LAYERS.LABELS,
      text,
      mapped.x,
      mapped.y,
      ctx.mapper.mapLength(fontSize),
      style,
      1,
      2,
    ),
  );
};

const showValueAbove = (def: ComponentDefinition, data: CircuitNodeData): boolean =>
  !!def.valueAbove && !!data.value;

const showValueBelow = (def: ComponentDefinition, data: CircuitNodeData): boolean =>
  !def.valueAbove && def.valueLabel !== null && !!data.value;

const rotate = (px: number, py: number, cx: number, cy: number, deg: number): Point => {
  if (!deg) return { x: px, y: py };
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
};
