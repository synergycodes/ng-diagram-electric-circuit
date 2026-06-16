import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  NgDiagramModelService,
  NgDiagramService,
  NgDiagramViewportService,
  type Point,
} from 'ng-diagram';
import { findEdgeSplitHit } from '../../geometry';
import { HIT_TOLERANCE_PX, PORT_SNAP_PX, SNAP_GRID_PX } from './config';

/**
 * Ghost junction preview shown while a wire is being drawn. When the dragged
 * endpoint hovers over an existing wire (and not near a port), a pulsing dashed
 * dot marks where dropping would create a junction — making link-to-link
 * connections discoverable.
 */
@Component({
  selector: 'app-link-drop-preview-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './link-drop-preview-overlay.component.html',
  styleUrl: './link-drop-preview-overlay.component.scss',
})
export class LinkDropPreviewOverlayComponent {
  private readonly modelService = inject(NgDiagramModelService);
  private readonly viewportService = inject(NgDiagramViewportService);
  private readonly ngDiagramService = inject(NgDiagramService);

  protected readonly transform = computed(() => {
    const viewport = this.viewportService.viewport();
    return `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`;
  });

  // The live linking gesture's dragged endpoint, in flow coordinates.
  private readonly linking = computed(() => this.ngDiagramService.actionState().linking);

  private readonly cursorWorld = computed<Point | null>(
    () => this.linking()?.temporaryEdge?.targetPosition ?? null,
  );

  // Where dropping would split a wire. Null when no gesture, when the cursor is
  // near a port (a real connection wins), or when not over any wire.
  protected readonly edgeHit = computed<Point | null>(() => {
    const link = this.linking();
    if (!link) return null;
    const cursor = this.cursorWorld();
    if (!cursor) return null;

    // Port snap wins over an edge hit — suppress the ghost there.
    const nearestPort = this.modelService.getNearestPortInRange(cursor, PORT_SNAP_PX);
    if (nearestPort && nearestPort.nodeId !== link.sourceNodeId) return null;

    const hit = findEdgeSplitHit(this.modelService.edges(), cursor, HIT_TOLERANCE_PX, SNAP_GRID_PX);
    return hit?.snapPoint ?? null;
  });
}
