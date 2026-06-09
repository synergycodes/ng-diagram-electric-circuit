import { describe, expect, it } from 'vitest';
import type { Edge, Point } from 'ng-diagram';
import { findEdgeSplitHit, samePoint, segmentAxis, splitPolylineAt } from './geometry';

const p = (x: number, y: number): Point => ({ x, y });

describe('samePoint', () => {
  it('treats sub-pixel differences as equal', () => {
    expect(samePoint(p(10, 10), p(10.5, 9.5))).toBe(true);
    expect(samePoint(p(10, 10), p(12, 10))).toBe(false);
  });
});

describe('segmentAxis', () => {
  it('classifies horizontal, vertical, and degenerate segments', () => {
    expect(segmentAxis(p(0, 0), p(10, 0))).toBe('horizontal');
    expect(segmentAxis(p(0, 0), p(0, 10))).toBe('vertical');
    expect(segmentAxis(p(0, 0), p(0, 0))).toBeNull();
    expect(segmentAxis(p(0, 0), p(10, 10))).toBeNull();
  });
});

describe('findEdgeSplitHit', () => {
  const edge = (points: Point[]): Edge => ({ id: 'e', source: 'a', target: 'b', points }) as Edge;

  it('snaps to the nearest segment, grid-aligned', () => {
    const hit = findEdgeSplitHit([edge([p(0, 0), p(100, 0)])], p(53, 4), 10, 10);
    expect(hit).not.toBeNull();
    expect(hit?.snapPoint).toEqual(p(50, 0));
    expect(hit?.segmentIndex).toBe(0);
  });

  it('rejects points beyond the hit tolerance', () => {
    expect(findEdgeSplitHit([edge([p(0, 0), p(100, 0)])], p(50, 40), 10, 10)).toBeNull();
  });

  it('rejects the outer endpoints of a single-segment edge', () => {
    expect(findEdgeSplitHit([edge([p(0, 0), p(100, 0)])], p(0, 0), 10, 10)).toBeNull();
    expect(findEdgeSplitHit([edge([p(0, 0), p(100, 0)])], p(100, 0), 10, 10)).toBeNull();
  });

  it('skips edges with fewer than two points', () => {
    expect(findEdgeSplitHit([edge([p(0, 0)])], p(0, 0), 10, 10)).toBeNull();
  });
});

describe('splitPolylineAt', () => {
  it('slices the polyline with the snap point in both halves', () => {
    const { firstHalf, secondHalf } = splitPolylineAt([p(0, 0), p(100, 0)], 0, p(50, 0));
    expect(firstHalf).toEqual([p(0, 0), p(50, 0)]);
    expect(secondHalf).toEqual([p(50, 0), p(100, 0)]);
  });

  it('collapses a zero-length seam when snapping onto an interior bend', () => {
    const { firstHalf, secondHalf } = splitPolylineAt([p(0, 0), p(50, 0), p(50, 50)], 1, p(50, 0));
    expect(firstHalf).toEqual([p(0, 0), p(50, 0)]);
    expect(secondHalf).toEqual([p(50, 0), p(50, 50)]);
  });
});
