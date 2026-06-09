// Post-delete junction maintenance: demote orphans, drop empties, merge halves.

import type { NgDiagramModelService, NgDiagramService, Node, Point } from 'ng-diagram';
import { JUNCTION_NODE_TYPE, junctionCentre } from './junction-model';
import { reconcileJunctions } from './junction-cleanup';

interface DeleteCleanupDeps {
  readonly modelService: NgDiagramModelService;
  readonly ngDiagramService: NgDiagramService;
}

interface DeletePayload {
  readonly deletedNodes: readonly Node[];
}

// Run the graph fixup AFTER ng-diagram has committed the delete. Inside the
// `selectionRemoved` handler the model is still mid-update — reads return stale
// state and nested mutations don't apply, which strands a junction when two need
// merging. ng-diagram commits later than a microtask, so defer to a macrotask;
// the snapshot is taken synchronously since the event object is reused.
export function applyDeleteCleanup(deps: DeleteCleanupDeps, payload: DeletePayload): void {
  const directlyDeletedJunctions = payload.deletedNodes
    .filter((node) => node.type === JUNCTION_NODE_TYPE)
    .map((node) => ({ id: node.id, position: node.position }));

  setTimeout(() => runCleanup(deps, directlyDeletedJunctions), 0);
}

function runCleanup(
  deps: DeleteCleanupDeps,
  directlyDeleted: readonly { id: string; position: Point }[],
): void {
  const { modelService, ngDiagramService } = deps;

  // Demote wires of a user-deleted junction to dangling, anchored at the spot
  // the junction occupied, so they don't reference a node that's gone.
  for (const { id, position } of directlyDeleted) {
    const anchor = junctionCentre(position);
    for (const edge of modelService.edges()) {
      if (edge.source === id) {
        modelService.updateEdge(edge.id, {
          source: '',
          sourcePort: undefined,
          sourcePosition: anchor,
        });
      } else if (edge.target === id) {
        modelService.updateEdge(edge.id, {
          target: '',
          targetPort: undefined,
          targetPosition: anchor,
        });
      }
    }
  }

  // Reconcile every surviving junction whose branch count may have shifted:
  // drop 0-leg orphans and collapse any 2-branch passthrough back into one wire
  // — deleting a component or a branch shouldn't leave a stranded junction.
  const junctionIds = modelService
    .nodes()
    .filter((node) => node.type === JUNCTION_NODE_TYPE)
    .map((node) => node.id);
  reconcileJunctions(modelService, ngDiagramService, junctionIds);
}
