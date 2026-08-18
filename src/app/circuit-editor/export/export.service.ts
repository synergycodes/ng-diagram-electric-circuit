import { inject, Injectable } from '@angular/core';
import { toJpeg } from 'html-to-image';
import { NgDiagramModelService, NgDiagramViewportService, type Edge, type Node } from 'ng-diagram';
import {
  COMPONENT_CATALOG,
  getSymbolSize,
  REF_ROW_HEIGHT,
  VALUE_ROW_HEIGHT,
} from '../diagram/model/component-catalog';
import { type CircuitNodeData } from '../diagram/model/component-types';
import { isCircuitNode, isWireEdge } from '../diagram/model/guards';
import { ProjectNameService } from '../top-navbar/project-name.service';
import { portWorldPosition } from '../diagram/wire/geometry';
import { JUNCTION_SIZE_PX, isJunctionNode, junctionCentre } from '../diagram/wire/junction';
import { symbolBody } from '../diagram/node/symbols/symbol-shapes';
import { buildCircuitDxfConfig } from './dxf-circuit/circuit-dxf-config';
import { DxfExporter } from './dxf/dxf-exporter';
import { DxfWriter } from './dxf/dxf-writer';

/** Serialized circuit document: components plus their port-to-port connections. */
interface CircuitDocument {
  format: 'ng-diagram-circuit';
  version: 1;
  generatedAt: string;
  components: {
    id: string;
    type: string;
    category: string;
    reference: string;
    value: string;
    description: string;
    specs: Record<string, string>;
    position: { x: number; y: number };
    rotation: number;
  }[];
  connections: {
    id: string;
    from: { component: string; port: string | undefined };
    to: { component: string; port: string | undefined };
  }[];
}

/**
 * Exports the schematic as JSON (a documented parts + connections format — the
 * connectivity standard for circuits is a SPICE netlist, but these generic
 * components don't map to SPICE device cards, so a clean JSON is used), as a
 * vector SVG, as a DXF (AutoCAD) drawing, or as a JPEG snapshot of the canvas.
 */
@Injectable()
export class ExportService {
  private readonly modelService = inject(NgDiagramModelService);
  private readonly viewport = inject(NgDiagramViewportService);
  private readonly projectName = inject(ProjectNameService);

  exportJson(): void {
    const doc = this.buildDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    this.download(blob, `${this.projectName.fileName()}.json`);
  }

  async exportJpeg(): Promise<void> {
    const element = document.querySelector<HTMLElement>('ng-diagram');
    if (!element) return;

    // Fit the whole schematic into view (awaitable since ng-diagram 1.3), then
    // give the browser a couple of frames to paint the fitted transform before
    // the DOM is cloned.
    await this.viewport.zoomToFit({ padding: [40, 40, 40, 40] });
    await nextFrame();

    const background = readVar('--ce-bg-canvas') || '#0b0718';
    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: background,
      // The page already loads Poppins, so skip inlining the cross-origin
      // Google Fonts stylesheet (which throws CORS errors and isn't needed).
      skipFonts: true,
      filter: (node) => !(node instanceof HTMLElement && node.dataset['exportIgnore'] === 'true'),
    });

    const blob = await (await fetch(dataUrl)).blob();
    this.download(blob, `${this.projectName.fileName()}.jpeg`);
  }

  /**
   * Exports an editable vector SVG built directly from the model (not an
   * html-to-image raster) — black ink on white, suitable for printing or
   * touching up in Illustrator/Inkscape. Symbol shapes come from the same
   * library the canvas renders.
   */
  exportSvg(): void {
    const svg = this.buildSvg();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    this.download(blob, `${this.projectName.fileName()}.svg`);
  }

  /**
   * Exports the schematic as a DXF (AutoCAD R2000+) file built from the model —
   * components, wires and junctions on their own layers, sized in millimetres.
   * Uses the vendored `dxf/` serializer (a strict R2000+ skeleton that real
   * desktop AutoCAD accepts) with circuit-specific renderers registered in
   * `buildCircuitDxfConfig`.
   */
  exportDxf(): void {
    const nodes = this.modelService.nodes();
    if (nodes.length === 0) return;
    const edges = this.modelService.edges();
    const bounds = this.modelService.computePartsBounds(nodes, edges);

    const doc = new DxfExporter(buildCircuitDxfConfig()).export(nodes, edges, bounds);
    const content = new DxfWriter().serialize(doc);

    const blob = new Blob([content], { type: 'application/dxf' });
    this.download(blob, `${this.projectName.fileName()}.dxf`);
  }

  private buildSvg(): string {
    const nodes = this.modelService.nodes();
    const edges = this.modelService.edges();
    const bbox = this.worldBbox(nodes, edges);
    if (!bbox) {
      return (
        `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"/>`
      );
    }

    const elements: string[] = [];
    // Wires first so component bodies sit on top of them.
    for (const edge of edges) {
      const rendered = renderEdge(edge);
      if (rendered) elements.push(rendered);
    }
    for (const node of nodes) {
      if (isCircuitNode(node)) elements.push(renderComponent(node));
    }
    // Junction dots last, on top of the wire ends they join.
    for (const node of nodes) {
      if (isJunctionNode(node)) {
        const centre = junctionCentre(node.position);
        elements.push(
          `<circle cx="${fmt(centre.x)}" cy="${fmt(centre.y)}" r="${JUNCTION_SIZE_PX / 2}" fill="${INK}" stroke="none"/>`,
        );
      }
    }

    const viewX = bbox.minX - MARGIN;
    const viewY = bbox.minY - MARGIN;
    const viewW = bbox.maxX - bbox.minX + 2 * MARGIN;
    const viewH = bbox.maxY - bbox.minY + 2 * MARGIN;

    return [
      `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(viewX)} ${fmt(viewY)} ${fmt(viewW)} ${fmt(viewH)}" ` +
        `color="${INK}" fill="none" stroke="currentColor" stroke-width="${STROKE_WIDTH}" ` +
        `stroke-linecap="round" stroke-linejoin="round" ` +
        `font-family="Poppins, ui-sans-serif, system-ui, sans-serif">`,
      `<rect x="${fmt(viewX)}" y="${fmt(viewY)}" width="${fmt(viewW)}" height="${fmt(viewH)}" fill="#ffffff" stroke="none"/>`,
      ...elements.filter((element) => element.length > 0),
      `</svg>`,
    ].join('\n');
  }

  // World-space bounding box of everything drawable. Node boxes contribute their
  // rotated corners (native rotation grows the AABB); circuit nodes also add the
  // rotated symbol box, which can extend past the node box when turned 90°.
  private worldBbox(
    nodes: readonly Node[],
    edges: readonly Edge[],
  ): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let any = false;
    const include = (x: number, y: number): void => {
      any = true;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    for (const node of nodes) {
      if (!node.size) continue;
      const { width, height } = node.size;
      const angle = node.angle ?? 0;
      const cx = node.position.x + width / 2;
      const cy = node.position.y + height / 2;
      for (const [lx, ly] of cornerOffsets(node.position.x, node.position.y, width, height)) {
        const r = rotate(lx, ly, cx, cy, angle);
        include(r.x, r.y);
      }
      if (isCircuitNode(node)) {
        const symbol = getSymbolSize(COMPONENT_CATALOG[node.data.componentType]);
        const box = symbolBox(node);
        const symLeft = node.position.x + box.left;
        const symTop = node.position.y + box.top;
        for (const [lx, ly] of cornerOffsets(symLeft, symTop, symbol.width, symbol.height)) {
          const r = rotate(lx, ly, cx, cy, angle);
          include(r.x, r.y);
        }
      }
    }
    for (const edge of edges) {
      if (!edge.points) continue;
      for (const point of edge.points) include(point.x, point.y);
    }
    return any ? { minX, minY, maxX, maxY } : null;
  }

  private buildDocument(): CircuitDocument {
    const components = this.modelService
      .nodes()
      .filter(isCircuitNode)
      .map((node) => ({
        id: node.id,
        type: node.data.componentType,
        category: COMPONENT_CATALOG[node.data.componentType].category,
        reference: node.data.reference,
        value: node.data.value,
        description: node.data.description,
        specs: node.data.specs,
        position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
        rotation: node.angle ?? 0,
      }));

    const connections = this.modelService
      .edges()
      .filter(isWireEdge)
      .map((edge) => ({
        id: edge.id,
        from: { component: edge.source, port: edge.sourcePort },
        to: { component: edge.target, port: edge.targetPort },
      }));

    return {
      format: 'ng-diagram-circuit',
      version: 1,
      generatedAt: new Date().toISOString(),
      components,
      connections,
    };
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

// ---- Vector SVG export helpers -------------------------------------------

// Black ink on white — a standard printable schematic, independent of the
// on-screen theme (CSS vars don't survive into a standalone file).
const INK = '#151516';
const VALUE_INK = '#6f7480';
const STROKE_WIDTH = 2;
const MARGIN = 32;

function renderEdge(edge: Edge): string {
  if (!isWireEdge(edge)) return '';
  const points = edge.points;
  if (!points || points.length < 2) return '';
  const poly = points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
  return `<polyline points="${poly}"/>`;
}

function renderComponent(node: Node<CircuitNodeData>): string {
  const def = COMPONENT_CATALOG[node.data.componentType];
  const symbol = getSymbolSize(def);
  const width = node.size?.width ?? symbol.width;
  const height = node.size?.height ?? REF_ROW_HEIGHT + symbol.height;
  const { left: symLeft, top: symTop } = symbolBox(node);

  // preserveAspectRatio="none" mirrors the on-canvas stretch into the grid-
  // snapped symbol box.
  let inner =
    `<svg x="${fmt(symLeft)}" y="${fmt(symTop)}" width="${fmt(symbol.width)}" height="${fmt(symbol.height)}" ` +
    `viewBox="0 0 ${def.symbol.width} ${def.symbol.height}" preserveAspectRatio="none" overflow="visible">` +
    `${symbolBody(def.type)}</svg>`;

  // Rotate the symbol around the node centre; labels stay upright (matching the
  // on-canvas counter-rotation).
  const angle = node.angle ?? 0;
  if (angle) {
    inner = `<g transform="rotate(${fmt(angle)} ${fmt(width / 2)} ${fmt(height / 2)})">${inner}</g>`;
  }

  // Labels sit relative to the resolved symbol box: reference above, value
  // below (or above, between the reference and symbol, for ICs).
  const cx = symLeft + symbol.width / 2;
  const labels: string[] = [];
  if (showValueAbove(def, node.data)) {
    if (node.data.reference) {
      labels.push(
        label(
          cx,
          symTop - VALUE_ROW_HEIGHT - REF_ROW_HEIGHT / 2,
          INK,
          12,
          600,
          node.data.reference,
        ),
      );
    }
    labels.push(label(cx, symTop - VALUE_ROW_HEIGHT / 2, VALUE_INK, 11, 400, node.data.value));
  } else {
    if (node.data.reference) {
      labels.push(label(cx, symTop - REF_ROW_HEIGHT / 2, INK, 12, 600, node.data.reference));
    }
    if (showValueBelow(def, node.data)) {
      labels.push(
        label(
          cx,
          symTop + symbol.height + VALUE_ROW_HEIGHT / 2,
          VALUE_INK,
          11,
          400,
          node.data.value,
        ),
      );
    }
  }

  return `<g transform="translate(${fmt(node.position.x)} ${fmt(node.position.y)})">${inner}${labels.join('')}</g>`;
}

// Symbol-box rect within the node, derived from the live port anchors so it
// lines up exactly with the wires (which connect to those ports). The terminal
// for a port sits at (cx·symW, cy·symH) inside the box, so the box origin is the
// anchor minus that offset; averaging the ports cancels per-side rounding. Falls
// back to the reserved-row layout when ports aren't measured yet.
function symbolBox(node: Node<CircuitNodeData>): { left: number; top: number } {
  const def = COMPONENT_CATALOG[node.data.componentType];
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
}

function showValueAbove(
  def: (typeof COMPONENT_CATALOG)[keyof typeof COMPONENT_CATALOG],
  data: CircuitNodeData,
): boolean {
  return !!def.valueAbove && !!data.value;
}

function showValueBelow(
  def: (typeof COMPONENT_CATALOG)[keyof typeof COMPONENT_CATALOG],
  data: CircuitNodeData,
): boolean {
  return !def.valueAbove && def.valueLabel !== null && !!data.value;
}

function label(
  x: number,
  y: number,
  fill: string,
  size: number,
  weight: number,
  content: string,
): string {
  return (
    `<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" dominant-baseline="central" ` +
    `font-size="${size}" font-weight="${weight}" fill="${fill}" stroke="none">${escapeXml(content)}</text>`
  );
}

function cornerOffsets(
  x: number,
  y: number,
  width: number,
  height: number,
): readonly (readonly [number, number])[] {
  return [
    [x, y],
    [x + width, y],
    [x, y + height],
    [x + width, y + height],
  ];
}

function rotate(
  px: number,
  py: number,
  cx: number,
  cy: number,
  deg: number,
): { x: number; y: number } {
  if (!deg) return { x: px, y: py };
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmt(value: number): string {
  return String(+value.toFixed(3));
}
