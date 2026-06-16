import { computed, inject, Injectable, signal } from '@angular/core';
import { NgDiagramModelService, NgDiagramSelectionService, type Node } from 'ng-diagram';
import { type CircuitNodeData } from '../diagram/model/component-types';
import { isCircuitNode } from '../diagram/model/guards';

type SidebarState = 'empty' | 'single' | 'multi';

/**
 * Drives the properties sidebar: tracks panel visibility, exposes the current
 * single-selection circuit node, and applies edits back to the model.
 */
@Injectable()
export class PropertiesSidebarService {
  private readonly selectionService = inject(NgDiagramSelectionService);
  private readonly modelService = inject(NgDiagramModelService);

  readonly isExpanded = signal(false);

  readonly selectedNodes = computed<Node<CircuitNodeData>[]>(() =>
    this.selectionService.selection().nodes.filter(isCircuitNode),
  );

  readonly selectedNode = computed<Node<CircuitNodeData> | undefined>(() =>
    this.selectedNodes().at(0),
  );

  readonly sidebarState = computed<SidebarState>(() => {
    const count = this.selectedNodes().length;
    if (count === 0) return 'empty';
    if (count > 1) return 'multi';
    return 'single';
  });

  expandSidebar(): void {
    this.isExpanded.set(true);
  }

  toggleSidebarVisibility(): void {
    this.isExpanded.update((v) => !v);
  }

  /** Merge-patches a node's data (specs are merged shallowly) and writes it back. */
  patchData(nodeId: string, patch: Partial<CircuitNodeData>): void {
    const node = this.modelService.getNodeById<CircuitNodeData>(nodeId);
    if (!node) return;

    const next: CircuitNodeData = {
      ...node.data,
      ...patch,
      specs: patch.specs ? { ...node.data.specs, ...patch.specs } : node.data.specs,
    };
    this.modelService.updateNodeData<CircuitNodeData>(nodeId, next);
  }

  removeNode(nodeId: string): void {
    this.modelService.deleteNodes([nodeId]);
  }
}
