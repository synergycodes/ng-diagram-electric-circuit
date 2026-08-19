// Post-delete junction maintenance: demote orphans, drop empties, merge halves.

import type { Edge, NgDiagramModelService, NgDiagramService, Node } from 'ng-diagram';
import { JUNCTION_NODE_TYPE, junctionCentre } from '../model';
import { reconcileJunctions } from './cleanup';

interface DeleteCleanupDeps {
  readonly modelService: NgDiagramModelService;
  readonly ngDiagramService: NgDiagramService;
}

interface DeletePayload {
  readonly deletedNodes: readonly Node[];
  readonly deletedEdges: readonly Edge[];
}

// `selectionRemoved` is emitted after the delete is committed, so the fixup
// runs straight from the handler. Reads go through the committed model
// (`getModel()`) — the `nodes()`/`edges()` signals refresh on the next
// change-detection pass and are still stale inside event handlers.
export async function applyDeleteCleanup(
  deps: DeleteCleanupDeps,
  payload: DeletePayload,
): Promise<void> {
  const { modelService, ngDiagramService } = deps;

  // Wires of a user-deleted junction come back as dangling wires anchored at
  // the spot the junction occupied — deleting the dot shouldn't take the whole
  // wire with it. The delete commit removes every edge incident to a deleted
  // node, so the demoted wires are rebuilt from the payload's `deletedEdges`
  // snapshot; a wire whose far end was deleted too stays deleted.
  const deletedNodeIds = new Set(payload.deletedNodes.map((node) => node.id));
  const junctionAnchors = new Map(
    payload.deletedNodes
      .filter((node) => node.type === JUNCTION_NODE_TYPE)
      .map((node) => [node.id, junctionCentre(node.position)] as const),
  );

  const demoted: Edge[] = [];
  for (const edge of payload.deletedEdges) {
    // A wire the user deleted explicitly (part of the selection) stays deleted.
    if (edge.selected) continue;
    const sourceAnchor = junctionAnchors.get(edge.source);
    const targetAnchor = junctionAnchors.get(edge.target);
    if (sourceAnchor && !deletedNodeIds.has(edge.target)) {
      demoted.push({
        ...edge,
        selected: false,
        source: '',
        sourcePort: undefined,
        sourcePosition: sourceAnchor,
      });
    } else if (targetAnchor && !deletedNodeIds.has(edge.source)) {
      demoted.push({
        ...edge,
        selected: false,
        target: '',
        targetPort: undefined,
        targetPosition: targetAnchor,
      });
    }
  }
  // Await the re-add so the survivor reconciliation below sees the demoted
  // wires, not a half-applied model.
  if (demoted.length > 0) await modelService.addEdges(demoted);

  // Reconcile every surviving junction whose branch count may have shifted:
  // drop 0-leg orphans and collapse any 2-branch passthrough back into one wire
  // — deleting a component or a branch shouldn't leave a stranded junction.
  const junctionIds = modelService
    .getModel()
    .getNodes()
    .filter((node) => node.type === JUNCTION_NODE_TYPE)
    .map((node) => node.id);
  reconcileJunctions(modelService, ngDiagramService, junctionIds);
}
