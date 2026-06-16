import { describe, expect, it } from 'vitest';
import type { Point } from 'ng-diagram';
import {
  findReshapeableSegments,
  neighborAxis,
  orthogonalizePolyline,
  realignEndpointNeighbor,
  reshapeAnchoredSegment,
} from './edge-reshape';

const p = (x: number, y: number): Point => ({ x, y });

describe('findReshapeableSegments', () => {
  it('emits one handle per orthogonal segment', () => {
    const segs = findReshapeableSegments([p(0, 0), p(100, 0), p(100, 100)], 'port', 'port');
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({
      segmentIndex: 0,
      axis: 'horizontal',
      anchorPortAtSource: true,
    });
    expect(segs[1]).toMatchObject({ segmentIndex: 1, axis: 'vertical', anchorPortAtTarget: true });
  });

  it('flags junction propagation on end segments', () => {
    const segs = findReshapeableSegments([p(0, 0), p(100, 0)], 'junction', 'junction');
    expect(segs[0].propagateToJunction).toBe('source');
  });

  it('returns nothing for degenerate input', () => {
    expect(findReshapeableSegments([p(0, 0)], 'port', 'port')).toEqual([]);
    expect(findReshapeableSegments(undefined, 'port', 'port')).toEqual([]);
  });
});

describe('reshapeAnchoredSegment', () => {
  it('shifts a free segment perpendicular to its axis with grid snap', () => {
    const out = reshapeAnchoredSegment(
      [p(0, 0), p(100, 0)],
      0,
      'horizontal',
      0,
      23,
      10,
      false,
      false,
    );
    expect(out).toEqual([p(0, 20), p(100, 20)]);
  });

  it('inserts an elbow so a port-anchored end stays put', () => {
    const out = reshapeAnchoredSegment(
      [p(0, 0), p(100, 0)],
      0,
      'horizontal',
      0,
      30,
      10,
      true,
      false,
    );
    expect(out[0]).toEqual(p(0, 0));
    expect(out[out.length - 1]).toEqual(p(100, 30));
  });
});

describe('neighborAxis', () => {
  it('reports the end-segment axis', () => {
    expect(neighborAxis([p(0, 0), p(0, 50)], 'source')).toBe('vertical');
    expect(neighborAxis([p(0, 0), p(50, 0)], 'target')).toBe('horizontal');
    expect(neighborAxis([p(0, 0), p(50, 50)], 'source')).toBeNull();
  });
});

describe('realignEndpointNeighbor', () => {
  it('snaps the neighbour onto the captured axis', () => {
    const pts = [p(0, 0), p(2, 50)];
    realignEndpointNeighbor(pts, 'source', 'vertical');
    expect(pts[1].x).toBe(0);
  });

  it('is a no-op for an oblique end-segment', () => {
    const pts = [p(0, 0), p(2, 50)];
    realignEndpointNeighbor(pts, 'source', null);
    expect(pts[1]).toEqual(p(2, 50));
  });
});

describe('orthogonalizePolyline', () => {
  it('replaces an oblique segment with a vertical-first L-bend', () => {
    expect(orthogonalizePolyline([p(0, 0), p(100, 100)])).toEqual([
      p(0, 0),
      p(0, 100),
      p(100, 100),
    ]);
  });

  it('leaves an already-orthogonal polyline alone', () => {
    expect(orthogonalizePolyline([p(0, 0), p(0, 50), p(50, 50)])).toEqual([
      p(0, 0),
      p(0, 50),
      p(50, 50),
    ]);
  });
});
