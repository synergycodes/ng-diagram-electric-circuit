import type { Edge, Node } from 'ng-diagram';
import {
  CIRCUIT_NODE_TYPE,
  WIRE_EDGE_TYPE,
  type CircuitEdgeData,
  type CircuitNodeData,
} from './component-types';

export function isCircuitNode(node: Node | null | undefined): node is Node<CircuitNodeData> {
  return !!node && node.type === CIRCUIT_NODE_TYPE;
}

export function isWireEdge(edge: Edge | null | undefined): edge is Edge<CircuitEdgeData> {
  return !!edge && edge.type === WIRE_EDGE_TYPE;
}

/** True when any edge already terminates on the given node port. */
export function portHasConnection(edges: readonly Edge[], nodeId: string, portId: string): boolean {
  return edges.some(
    (edge) =>
      (edge.source === nodeId && edge.sourcePort === portId) ||
      (edge.target === nodeId && edge.targetPort === portId),
  );
}
