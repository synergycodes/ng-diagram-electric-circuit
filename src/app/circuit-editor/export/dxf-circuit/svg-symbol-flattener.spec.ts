// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ComponentType } from '../../diagram/model/component-types';
import { symbolBody } from '../../diagram/node/symbols/symbol-shapes';
import { flattenSvgBody } from './svg-symbol-flattener';

describe('flattenSvgBody', () => {
  it('keeps the exact vertices of a straight polyline (resistor zig-zag)', () => {
    const flat = flattenSvgBody(symbolBody(ComponentType.Resistor));
    expect(flat.texts).toHaveLength(0);
    expect(flat.polylines).toHaveLength(1);
    const line = flat.polylines[0];
    expect(line.closed).toBe(false);
    // The sharp peaks must survive — no arc-length resampling that clips them.
    expect(line.points).toEqual([
      { x: 0, y: 18 },
      { x: 36, y: 18 },
      { x: 40, y: 9 },
      { x: 48, y: 27 },
      { x: 56, y: 9 },
      { x: 64, y: 27 },
      { x: 72, y: 9 },
      { x: 80, y: 27 },
      { x: 84, y: 18 },
      { x: 120, y: 18 },
    ]);
  });

  it('marks a filled straight triangle (diode) closed with its three vertices', () => {
    const flat = flattenSvgBody(symbolBody(ComponentType.Diode));
    const triangle = flat.polylines.find((p) => p.closed);
    expect(triangle).toBeDefined();
    expect(triangle?.points).toEqual([
      { x: 36, y: 8 },
      { x: 36, y: 28 },
      { x: 58, y: 18 },
    ]);
  });

  it('samples an arc path into many short segments starting/ending on the endpoints', () => {
    const flat = flattenSvgBody(symbolBody(ComponentType.Inductor));
    // Two straight leads + one arc path.
    const arc = flat.polylines.find((p) => p.points.length > 4);
    expect(arc).toBeDefined();
    expect(arc?.points[0]).toEqual({ x: 30, y: 18 });
    const last = arc!.points.at(-1)!;
    // Four bumps of radius 7.5 → ends at x = 30 + 4*15 = 90, back on the axis.
    expect(last.x).toBeCloseTo(90, 3);
    expect(last.y).toBeCloseTo(18, 3);
  });

  it('extracts IC pin-number text with alignment (NE555)', () => {
    const flat = flattenSvgBody(symbolBody(ComponentType.Ne555));
    expect(flat.texts.length).toBeGreaterThan(0);
    const pin1 = flat.texts.find((t) => t.text === '1');
    expect(pin1).toBeDefined();
    expect(pin1?.halign).toBe(0); // text-anchor="start"
    const pin14 = flat.texts.find((t) => t.text === '14');
    expect(pin14?.halign).toBe(2); // text-anchor="end"
  });

  it('turns a circle into a closed polygon (switch contact dot)', () => {
    const flat = flattenSvgBody(symbolBody(ComponentType.Switch));
    const dot = flat.polylines.find((p) => p.closed && p.points.length >= 12);
    expect(dot).toBeDefined();
  });

  it('flattens every catalog symbol without throwing', () => {
    for (const type of Object.values(ComponentType)) {
      expect(() => flattenSvgBody(symbolBody(type)), type).not.toThrow();
    }
  });
});
