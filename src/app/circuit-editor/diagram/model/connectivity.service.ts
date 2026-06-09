import { Injectable, computed, inject } from '@angular/core';
import { NgDiagramModelService, type Edge } from 'ng-diagram';

const EMPTY_PORTS: ReadonlySet<string> = new Set<string>();
const EMPTY_EDGES: readonly Edge[] = [];

/**
 * Shared adjacency indexes over the edge set, each rebuilt once per `edges()`
 * change. Without this, every node computed its own connected-port set by
 * scanning all edges, making render O(N x E); now it is O(E) once plus O(1)
 * lookups. Provided at the page level so node templates and the diagram host
 * share one instance.
 */
@Injectable()
export class ConnectivityService {
  private readonly modelService = inject(NgDiagramModelService);

  /** node id -> set of its port ids that carry a wire. */
  private readonly portIndex = computed(() => {
    const map = new Map<string, Set<string>>();
    const add = (nodeId: string, portId: string | undefined): void => {
      if (!nodeId || !portId) return;
      const set = map.get(nodeId);
      if (set) set.add(portId);
      else map.set(nodeId, new Set([portId]));
    };
    for (const edge of this.modelService.edges()) {
      add(edge.source, edge.sourcePort);
      add(edge.target, edge.targetPort);
    }
    return map;
  });

  /** node id -> edges incident to it. */
  private readonly incidentIndex = computed(() => {
    const map = new Map<string, Edge[]>();
    const add = (nodeId: string, edge: Edge): void => {
      if (!nodeId) return;
      const list = map.get(nodeId);
      if (list) list.push(edge);
      else map.set(nodeId, [edge]);
    };
    for (const edge of this.modelService.edges()) {
      add(edge.source, edge);
      if (edge.target !== edge.source) add(edge.target, edge);
    }
    return map;
  });

  /** Port ids of `nodeId` that carry a wire (reactive). */
  connectedPorts(nodeId: string): ReadonlySet<string> {
    return this.portIndex().get(nodeId) ?? EMPTY_PORTS;
  }

  /** Distinct edges incident to any of `nodeIds`. */
  incidentEdges(nodeIds: ReadonlySet<string>): Edge[] {
    const index = this.incidentIndex();
    const seen = new Set<string>();
    const result: Edge[] = [];
    for (const id of nodeIds) {
      for (const edge of index.get(id) ?? EMPTY_EDGES) {
        if (!seen.has(edge.id)) {
          seen.add(edge.id);
          result.push(edge);
        }
      }
    }
    return result;
  }
}
