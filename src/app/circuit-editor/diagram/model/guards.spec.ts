import { describe, expect, it } from 'vitest';
import type { Edge } from 'ng-diagram';
import { CIRCUIT_NODE_TYPE, WIRE_EDGE_TYPE } from './component-types';
import { isCircuitNode, isWireEdge, portHasConnection } from './guards';

function edge(partial: Partial<Edge>): Edge {
  return { id: 'e', source: '', target: '', ...partial } as Edge;
}

describe('isCircuitNode', () => {
  it('accepts a circuit node and rejects others / nullish', () => {
    expect(isCircuitNode({ id: 'n', type: CIRCUIT_NODE_TYPE } as never)).toBe(true);
    expect(isCircuitNode({ id: 'n', type: 'junction' } as never)).toBe(false);
    expect(isCircuitNode(null)).toBe(false);
    expect(isCircuitNode(undefined)).toBe(false);
  });
});

describe('isWireEdge', () => {
  it('accepts a wire edge and rejects others / nullish', () => {
    expect(isWireEdge(edge({ type: WIRE_EDGE_TYPE }))).toBe(true);
    expect(isWireEdge(edge({ type: 'other' as never }))).toBe(false);
    expect(isWireEdge(null)).toBe(false);
  });
});

describe('portHasConnection', () => {
  const edges = [
    edge({ id: 'a', source: 'n1', sourcePort: 'out', target: 'n2', targetPort: 'in' }),
  ];

  it('detects a connection on the source side', () => {
    expect(portHasConnection(edges, 'n1', 'out')).toBe(true);
  });

  it('detects a connection on the target side', () => {
    expect(portHasConnection(edges, 'n2', 'in')).toBe(true);
  });

  it('returns false for an unused port', () => {
    expect(portHasConnection(edges, 'n1', 'in')).toBe(false);
    expect(portHasConnection(edges, 'n3', 'out')).toBe(false);
    expect(portHasConnection([], 'n1', 'out')).toBe(false);
  });
});
