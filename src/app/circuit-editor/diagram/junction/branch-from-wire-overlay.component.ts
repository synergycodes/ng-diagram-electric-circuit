import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NgDiagramModelService,
  NgDiagramSelectionService,
  NgDiagramService,
  NgDiagramViewportService,
  type Point,
} from 'ng-diagram';
import { GRID_UNIT } from '../model/component-catalog';
import { findEdgeSplitHit, type EdgeSplitHit } from './geometry';
import { JUNCTION_SIZE_PX } from './junction-model';
import { PointerDragController } from './pointer-drag-controller';
import { JunctionTopologyService } from './junction-topology.service';

// Drag distance before a press on the indicator becomes a branch (vs a click
// that just selects the wire).
const BRANCH_THRESHOLD_PX = 4;

/** Cursor-to-port snap distance — mirrors ng-diagram's default link snap. */
const PORT_SNAP_PX = GRID_UNIT * 2;

interface BranchDragState {
  readonly edgeId: string;
  readonly hit: EdgeSplitHit;
  readonly startClientX: number;
  readonly startClientY: number;
  branching: boolean;
  junctionId: string | null;
  branchEdgeId: string | null;
}

/**
 * Hover affordance for starting a link-to-link connection *from* a wire. When
 * the cursor hovers an (unselected) wire, a pulsing ghost-junction dot — the
 * same indicator shown on the target wire while drawing a link — appears at the
 * grid-snapped point. Dragging from it splits the wire there and pulls out a new
 * branch that follows the cursor, resolving on release to a port, another wire
 * (nested junction), a nearby junction, or cancelling. A plain click selects the
 * wire instead (so it can be reshaped).
 */
@Component({
  selector: 'app-branch-from-wire-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branch-from-wire-overlay.component.html',
  styleUrl: './branch-from-wire-overlay.component.scss',
})
export class BranchFromWireOverlayComponent {
  private readonly modelService = inject(NgDiagramModelService);
  private readonly viewportService = inject(NgDiagramViewportService);
  private readonly ngDiagramService = inject(NgDiagramService);
  private readonly selectionService = inject(NgDiagramSelectionService);
  private readonly topology = inject(JunctionTopologyService);

  private readonly cursorWorld = signal<Point | null>(null);
  private readonly gestureActive = signal(false);
  // Set once a branch is actually being dragged (after the move threshold), so
  // the target indicator can react to the live drop point.
  private readonly activeBranch = signal<{ branchEdgeId: string; junctionId: string } | null>(null);

  private readonly drag = new PointerDragController<BranchDragState>(
    {
      onMove: (event, state) => this.onMove(event, state),
      onEnd: (event, state) => this.onEnd(event, state),
      onTeardown: () => {
        this.gestureActive.set(false);
        this.activeBranch.set(null);
      },
    },
    // Document-bound so the gesture survives the ghost hiding once the drag
    // starts; rAF-coalesced since each move re-routes the branch edge.
    { listenerTarget: 'document', coalesce: true },
  );

  protected readonly transform = computed(() => {
    const viewport = this.viewportService.viewport();
    return `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`;
  });

  // The wire point under the cursor where a branch could start. Hidden during
  // any active gesture, while a native link draw is in flight, and over a wire
  // that's already selected (the reshape overlay owns that one).
  protected readonly hoverHit = computed<EdgeSplitHit | null>(() => {
    if (this.gestureActive()) return null;
    if (this.ngDiagramService.actionState().linking) return null;
    const cursor = this.cursorWorld();
    if (!cursor) return null;
    const hit = findEdgeSplitHit(this.modelService.edges(), cursor, GRID_UNIT, GRID_UNIT);
    if (!hit) return null;
    if (this.selectionService.selection().edges.some((edge) => edge.id === hit.edge.id)) {
      return null;
    }
    return hit;
  });

  // While a branch is being dragged, the same ghost indicator marks the wire it
  // would drop onto (a nested junction). Hidden when a nearby junction or port
  // would win the drop instead, and never on the branch's own wires.
  protected readonly targetHit = computed<Point | null>(() => {
    const active = this.activeBranch();
    if (!active) return null;
    const cursor = this.cursorWorld();
    if (!cursor) return null;

    const nearJunction = this.topology.findNearbyJunction(cursor, JUNCTION_SIZE_PX);
    if (nearJunction && nearJunction.id !== active.junctionId) return null;
    const port = this.modelService.getNearestPortInRange(cursor, PORT_SNAP_PX);
    if (port && port.nodeId !== active.junctionId) return null;

    const exclude = new Set<string>([
      active.branchEdgeId,
      ...this.modelService.getConnectedEdges(active.junctionId).map((edge) => edge.id),
    ]);
    const hit = findEdgeSplitHit(
      this.modelService.edges().filter((edge) => !exclude.has(edge.id)),
      cursor,
      GRID_UNIT,
      GRID_UNIT,
    );
    return hit?.snapPoint ?? null;
  });

  constructor() {
    let pendingEvent: PointerEvent | null = null;
    let rafHandle: number | null = null;
    const onPointerMove = (event: PointerEvent): void => {
      pendingEvent = event;
      if (rafHandle !== null) return;
      rafHandle = requestAnimationFrame(() => {
        rafHandle = null;
        const pending = pendingEvent;
        pendingEvent = null;
        if (!pending) return;
        this.cursorWorld.set(
          this.viewportService.clientToFlowPosition({ x: pending.clientX, y: pending.clientY }),
        );
      });
    };
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('pointermove', onPointerMove);
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      this.drag.teardown();
    });
  }

  protected onPointerDown(event: PointerEvent): void {
    const hit = this.hoverHit();
    if (!hit) return;
    // Take over the gesture — don't let ng-diagram box-select / pan.
    event.stopPropagation();
    event.preventDefault();
    this.gestureActive.set(true);
    this.drag.begin(event, event.currentTarget as HTMLElement, {
      edgeId: hit.edge.id,
      hit,
      startClientX: event.clientX,
      startClientY: event.clientY,
      branching: false,
      junctionId: null,
      branchEdgeId: null,
    });
  }

  private onMove(event: PointerEvent, state: BranchDragState): void {
    const world = this.viewportService.clientToFlowPosition({ x: event.clientX, y: event.clientY });
    if (!state.branching) {
      const moved = Math.hypot(
        event.clientX - state.startClientX,
        event.clientY - state.startClientY,
      );
      if (moved < BRANCH_THRESHOLD_PX) return;
      const ids = this.topology.beginWireBranch(state.hit, world);
      if (!ids) return;
      state.branching = true;
      state.junctionId = ids.junctionId;
      state.branchEdgeId = ids.branchEdgeId;
      this.activeBranch.set(ids);
    }
    if (state.branchEdgeId) this.topology.dragWireBranch(state.branchEdgeId, world);
  }

  private onEnd(event: PointerEvent, state: BranchDragState): void {
    if (state.branching && state.branchEdgeId && state.junctionId) {
      const world = this.viewportService.clientToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      this.topology.endWireBranch(state.branchEdgeId, state.junctionId, world);
    } else {
      // A click, not a drag — select the wire so it can be reshaped.
      this.selectionService.select([], [state.edgeId]);
    }
  }
}
