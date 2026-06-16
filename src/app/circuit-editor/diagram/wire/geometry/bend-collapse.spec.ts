import { describe, expect, it } from 'vitest';
import type { Point } from 'ng-diagram';
import { collapseCollinearBends, dropSameAxisBends } from './bend-collapse';

const p = (x: number, y: number): Point => ({ x, y });

describe('collapseCollinearBends', () => {
  it('drops a pass-through vertex on a straight run', () => {
    expect(collapseCollinearBends([p(0, 0), p(50, 0), p(100, 0)])).toEqual([p(0, 0), p(100, 0)]);
  });

  it('keeps a genuine L corner', () => {
    expect(collapseCollinearBends([p(0, 0), p(50, 0), p(50, 50)])).toEqual([
      p(0, 0),
      p(50, 0),
      p(50, 50),
    ]);
  });

  it('keeps a U-turn vertex (not between its neighbours)', () => {
    expect(collapseCollinearBends([p(0, 0), p(100, 0), p(50, 0)])).toEqual([
      p(0, 0),
      p(100, 0),
      p(50, 0),
    ]);
  });

  it('returns a copy unchanged for short polylines', () => {
    expect(collapseCollinearBends([p(0, 0), p(10, 0)])).toEqual([p(0, 0), p(10, 0)]);
  });
});

describe('dropSameAxisBends', () => {
  it('drops a quasi-collinear vertex sharing a dominant axis', () => {
    expect(dropSameAxisBends([p(0, 0), p(50, 2), p(100, 0)])).toEqual([p(0, 0), p(100, 0)]);
  });

  it('keeps an L corner where the axis changes', () => {
    expect(dropSameAxisBends([p(0, 0), p(50, 0), p(50, 50)])).toEqual([
      p(0, 0),
      p(50, 0),
      p(50, 50),
    ]);
  });
});
