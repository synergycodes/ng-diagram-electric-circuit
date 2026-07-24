import type { Point } from 'ng-diagram';
import { CURVE_SAMPLE_STEP } from './circuit-dxf-constants';

/**
 * Flattens the shared SVG symbol markup (from `symbol-shapes.ts`) into plain
 * polylines + text, expressed in the symbol's own viewBox coordinates.
 *
 * The circuit symbols are the single source of truth for how components are
 * drawn (`ComponentSymbolComponent` and the SVG file export both read
 * `symbolBody`). Rather than re-encode every shape as DXF geometry — which
 * would drift from the on-canvas rendering — this reduces the same markup to
 * the two primitives the vendored DXF library ships proven renderers for:
 * LWPOLYLINE and TEXT. Curves (arcs, circles, rounded corners) are sampled
 * into short segments; straight primitives keep their exact vertices so sharp
 * corners (resistor zig-zag, diode/arrow triangles) stay crisp.
 *
 * Geometry is computed analytically (no `getPointAtLength`/layout dependency),
 * so it is deterministic and runs anywhere a DOMParser is available.
 */

export interface FlatPolyline {
  readonly points: Point[];
  readonly closed: boolean;
}

export interface FlatText {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly fontSize: number;
  /** 0 = left/start, 1 = center/middle, 2 = right/end. */
  readonly halign: 0 | 1 | 2;
}

export interface FlatSymbol {
  readonly polylines: FlatPolyline[];
  readonly texts: FlatText[];
}

export const flattenSvgBody = (body: string): FlatSymbol => {
  const polylines: FlatPolyline[] = [];
  const texts: FlatText[] = [];

  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
    'image/svg+xml',
  );
  const root = doc.documentElement;

  for (const el of Array.from(root.children)) {
    switch (el.tagName.toLowerCase()) {
      case 'line':
        polylines.push({
          points: [
            { x: num(el, 'x1'), y: num(el, 'y1') },
            { x: num(el, 'x2'), y: num(el, 'y2') },
          ],
          closed: false,
        });
        break;
      case 'polyline':
        polylines.push({ points: parsePoints(el.getAttribute('points')), closed: false });
        break;
      case 'polygon':
        polylines.push({ points: parsePoints(el.getAttribute('points')), closed: true });
        break;
      case 'rect':
        polylines.push(rectPolyline(el));
        break;
      case 'circle':
        polylines.push(circlePolyline(num(el, 'cx'), num(el, 'cy'), num(el, 'r')));
        break;
      case 'path':
        polylines.push(...parsePath(el.getAttribute('d') ?? ''));
        break;
      case 'text':
        texts.push({
          x: num(el, 'x'),
          y: num(el, 'y'),
          text: el.textContent ?? '',
          fontSize: num(el, 'font-size', 12),
          halign: anchorToHalign(el.getAttribute('text-anchor')),
        });
        break;
    }
  }

  return { polylines, texts };
};

const num = (el: Element, attr: string, fallback = 0): number => {
  const raw = el.getAttribute(attr);
  const value = raw === null ? NaN : parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
};

const anchorToHalign = (anchor: string | null): 0 | 1 | 2 => {
  if (anchor === 'middle') return 1;
  if (anchor === 'end') return 2;
  return 0;
};

const parsePoints = (raw: string | null): Point[] => {
  if (!raw) return [];
  const nums = raw
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const points: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: nums[i], y: nums[i + 1] });
  }
  return points;
};

// Rounded corners (rx) are dropped: at schematic scale the sharp-cornered
// rectangle is visually equivalent and keeps IC bodies to four segments.
const rectPolyline = (el: Element): FlatPolyline => {
  const x = num(el, 'x');
  const y = num(el, 'y');
  const w = num(el, 'width');
  const h = num(el, 'height');
  return {
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    closed: true,
  };
};

const circlePolyline = (cx: number, cy: number, r: number): FlatPolyline => {
  const circumference = 2 * Math.PI * r;
  const n = Math.max(12, Math.ceil(circumference / CURVE_SAMPLE_STEP));
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI;
    points.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  return { points, closed: true };
};

// ---- SVG path (`d`) parsing --------------------------------------------

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

const parsePath = (d: string): FlatPolyline[] => {
  const tokens = tokenizePath(d);
  const result: FlatPolyline[] = [];
  let current: Point[] = [];
  let closed = false;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  const flush = (): void => {
    if (current.length >= 2) result.push({ points: current, closed });
    current = [];
    closed = false;
  };

  for (const { cmd, args } of tokens) {
    const rel = cmd === cmd.toLowerCase();
    const c = cmd.toUpperCase();
    switch (c) {
      case 'M': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          const nx = rel ? cx + args[i] : args[i];
          const ny = rel ? cy + args[i + 1] : args[i + 1];
          if (i === 0) {
            flush();
            cx = nx;
            cy = ny;
            startX = nx;
            startY = ny;
            current.push({ x: cx, y: cy });
          } else {
            // Extra coordinate pairs after an M are implicit L commands.
            cx = nx;
            cy = ny;
            current.push({ x: cx, y: cy });
          }
        }
        break;
      }
      case 'L': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          cx = rel ? cx + args[i] : args[i];
          cy = rel ? cy + args[i + 1] : args[i + 1];
          current.push({ x: cx, y: cy });
        }
        break;
      }
      case 'H': {
        for (const a of args) {
          cx = rel ? cx + a : a;
          current.push({ x: cx, y: cy });
        }
        break;
      }
      case 'V': {
        for (const a of args) {
          cy = rel ? cy + a : a;
          current.push({ x: cx, y: cy });
        }
        break;
      }
      case 'A': {
        for (let i = 0; i + 6 < args.length; i += 7) {
          const rx = args[i];
          const ry = args[i + 1];
          const phi = args[i + 2];
          const largeArc = args[i + 3] !== 0;
          const sweep = args[i + 4] !== 0;
          const ex = rel ? cx + args[i + 5] : args[i + 5];
          const ey = rel ? cy + args[i + 6] : args[i + 6];
          for (const p of arcToPoints(cx, cy, rx, ry, phi, largeArc, sweep, ex, ey)) {
            current.push(p);
          }
          cx = ex;
          cy = ey;
        }
        break;
      }
      case 'Z': {
        closed = true;
        cx = startX;
        cy = startY;
        break;
      }
    }
  }
  flush();
  return result;
};

interface PathToken {
  readonly cmd: string;
  readonly args: number[];
}

const tokenizePath = (d: string): PathToken[] => {
  const tokens: PathToken[] = [];
  const parts = d.match(/[a-z][^a-z]*/gi) ?? [];
  for (const part of parts) {
    const cmd = part[0];
    const args = (part.slice(1).match(NUMBER) ?? []).map(Number);
    tokens.push({ cmd, args });
  }
  return tokens;
};

/**
 * Converts an SVG elliptical-arc segment (endpoint parameterization) into a
 * sampled point list, excluding the start point (already in the polyline).
 * Follows the implementation notes in the SVG spec, appendix F.6.
 */
const arcToPoints = (
  x0: number,
  y0: number,
  rxIn: number,
  ryIn: number,
  phiDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x: number,
  y: number,
): Point[] => {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [{ x, y }];

  const phi = (phiDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (x0 - x) / 2;
  const dy = (y0 - y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }

  const sign = largeArc !== sweep ? 1 : -1;
  const numerator = Math.max(0, rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p);
  const denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(denominator === 0 ? 0 : numerator / denominator);
  const cxp = (coef * (rx * y1p)) / ry;
  const cyp = (-coef * (ry * x1p)) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.min(1, Math.max(-1, len === 0 ? 1 : dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;

  const maxR = Math.max(rx, ry);
  const n = Math.max(2, Math.ceil((Math.abs(dtheta) * maxR) / CURVE_SAMPLE_STEP));
  const points: Point[] = [];
  for (let i = 1; i <= n; i++) {
    const t = theta1 + dtheta * (i / n);
    points.push({
      x: cosPhi * rx * Math.cos(t) - sinPhi * ry * Math.sin(t) + cx,
      y: sinPhi * rx * Math.cos(t) + cosPhi * ry * Math.sin(t) + cy,
    });
  }
  return points;
};
