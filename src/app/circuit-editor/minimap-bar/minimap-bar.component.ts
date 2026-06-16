import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  NgDiagramMinimapComponent,
  NgDiagramModelService,
  NgDiagramViewportService,
} from 'ng-diagram';
import { CIRCUIT_EDITOR_CONFIG } from '../circuit-editor.config';

/** Bottom-right bar: a zoom stepper plus a collapsible minimap. */
@Component({
  selector: 'app-minimap-bar',
  imports: [NgDiagramMinimapComponent],
  templateUrl: './minimap-bar.component.html',
  styleUrl: './minimap-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinimapBarComponent {
  private readonly config = inject(CIRCUIT_EDITOR_CONFIG);
  private readonly viewport = inject(NgDiagramViewportService);
  private readonly modelService = inject(NgDiagramModelService);

  protected readonly canZoomIn = this.viewport.canZoomIn;
  protected readonly canZoomOut = this.viewport.canZoomOut;
  protected readonly zoomPercent = computed(() => Math.round(this.viewport.scale() * 100) + '%');
  protected readonly deferNodeUpdates = computed(() => this.modelService.nodes().length >= 200);

  protected readonly isMinimapOpen = signal(false);

  protected zoomIn(): void {
    const scale = this.viewport.scale();
    this.viewport.zoom((scale + this.config.viewport.zoomStep) / scale);
  }

  protected zoomOut(): void {
    const scale = this.viewport.scale();
    this.viewport.zoom((scale - this.config.viewport.zoomStep) / scale);
  }

  protected toggleMinimap(): void {
    this.isMinimapOpen.update((v) => !v);
  }
}
