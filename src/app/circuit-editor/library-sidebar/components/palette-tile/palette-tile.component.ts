import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgDiagramPaletteItemComponent, NgDiagramPaletteItemPreviewComponent } from 'ng-diagram';
import { COMPONENT_CATALOG, toPaletteItem } from '../../../diagram/model/component-catalog';
import { type ComponentType } from '../../../diagram/model/component-types';
import { ComponentSymbolComponent } from '../../../diagram/node/symbols/component-symbol.component';

/**
 * A draggable library tile. Wraps ng-diagram's palette item so dropping it on
 * the canvas creates the matching component node; the preview element is used
 * as the drag image.
 */
@Component({
  selector: 'app-palette-tile',
  imports: [
    NgDiagramPaletteItemComponent,
    NgDiagramPaletteItemPreviewComponent,
    ComponentSymbolComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(dragstart)': 'onDragStart($event)' },
  template: `
    <ng-diagram-palette-item [item]="item()">
      <div class="tile">
        <div class="tile-symbol">
          <app-component-symbol [type]="type()" />
        </div>
        <span class="tile-label">{{ label() }}</span>
      </div>
      <ng-diagram-palette-item-preview>
        <div class="preview">
          <app-component-symbol [type]="type()" />
        </div>
      </ng-diagram-palette-item-preview>
    </ng-diagram-palette-item>
  `,
  styleUrl: './palette-tile.component.scss',
})
export class PaletteTileComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly type = input.required<ComponentType>();

  protected readonly item = computed(() => toPaletteItem(this.type()));
  protected readonly label = computed(() => COMPONENT_CATALOG[this.type()].label);

  /**
   * Centre the drag preview on the cursor. ng-diagram sets the drag image with a
   * top-left anchor (`setDragImage(node, 0, 0)`) on the inner palette element;
   * this handler runs later in the bubble phase and re-sets it with a centred
   * offset (the last `setDragImage` call during dragstart wins).
   */
  protected onDragStart(event: DragEvent): void {
    const transfer = event.dataTransfer;
    const preview = this.host.nativeElement.querySelector<HTMLElement>('.preview');
    if (!transfer || !preview) return;

    const ghost = preview.cloneNode(true) as HTMLElement;
    ghost.classList.add('dragged-node');
    ghost.style.position = 'fixed';
    ghost.style.top = '-9999px';
    ghost.style.left = '-9999px';
    ghost.style.margin = '0';
    document.body.appendChild(ghost);

    const rect = ghost.getBoundingClientRect();
    transfer.setDragImage(ghost, (rect.width || 64) / 2, (rect.height || 44) / 2);
    requestAnimationFrame(() => ghost.remove());
  }
}
