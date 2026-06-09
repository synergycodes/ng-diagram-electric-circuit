import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  NgDiagramNodeRotateAdornmentComponent,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
  type PortSide,
} from 'ng-diagram';
import { ContextMenuService } from '../../context-menu/context-menu.service';
import { EditorActionsService } from '../editor-actions.service';
import { COMPONENT_CATALOG, getSymbolSize } from '../model/component-catalog';
import { ConnectivityService } from '../model/connectivity.service';
import { type CircuitNodeData } from '../model/component-types';
import { ComponentSymbolComponent } from './symbols/component-symbol.component';

/**
 * Single template for every circuit component. The component kind lives in
 * `data.componentType`; this template looks up the catalog definition to draw
 * the reference label, schematic symbol, headline value and connection ports.
 *
 * Visual states mirror the design:
 * - default — symbol + labels, no chrome
 * - hover   — subtle rounded tile behind the symbol
 * - selected — violet outline + tint, symbol stroke turns orange
 */
@Component({
  selector: 'app-circuit-node',
  imports: [
    NgDiagramPortComponent,
    NgDiagramNodeRotateAdornmentComponent,
    ComponentSymbolComponent,
  ],
  templateUrl: './circuit-node.component.html',
  styleUrl: './circuit-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ng-diagram-port-hoverable-over-node',
    '[class.selected]': 'node().selected',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class CircuitNodeComponent implements NgDiagramNodeTemplate<CircuitNodeData> {
  private readonly contextMenu = inject(ContextMenuService);
  private readonly actions = inject(EditorActionsService);
  private readonly connectivity = inject(ConnectivityService);

  readonly node = input.required<Node<CircuitNodeData>>();

  protected readonly data = computed(() => this.node().data);
  protected readonly def = computed(() => COMPONENT_CATALOG[this.data().componentType]);

  /**
   * Counter-rotation that keeps the reference / value labels upright while the
   * node is rotated. The whole node template rotates by `node.angle`, so the
   * labels rotate back by the same amount around their own centre.
   */
  protected readonly labelTransform = computed(() => {
    const angle = this.node().angle ?? 0;
    return angle ? `rotate(${-angle}deg)` : null;
  });

  /** Ids of this node's ports that already terminate a wire (O(1) via the shared index). */
  private readonly connectedPortIds = computed(() =>
    this.connectivity.connectedPorts(this.node().id),
  );

  /**
   * Ports with pre-computed inline positions. ng-diagram routes a wire to the
   * edge of the port's box, so each port is nudged inward by its radius — that
   * pushes the routed endpoint back onto the symbol's terminal, leaving no gap
   * when the dot is hidden. Offsets are in the node's local px (which scale with
   * zoom alongside the port), so the alignment holds at every zoom level.
   */
  protected readonly portViews = computed(() => {
    const connected = this.connectedPortIds();
    return this.def().ports.map((port) => ({
      id: port.id,
      side: port.side,
      left: `calc(${port.cx * 100}% + ${sideOffsetX(port.side)}px)`,
      top: `calc(${port.cy * 100}% + ${sideOffsetY(port.side)}px)`,
      connected: connected.has(port.id),
    }));
  });

  /**
   * Inset (CSS `top right bottom left`) for the hover/selection outline, which
   * wraps the whole node. A side that carries a label wraps the label (so the
   * reference / value text stays inside); a bare side that carries a port is
   * pulled in to the port center (the outline runs through the dots); any other
   * side gets light breathing room.
   */
  protected readonly selectionInset = computed(() => {
    const sides = new Set(this.def().ports.map((p) => p.side));
    const hasTopLabel = true; // the reference label is always rendered on top
    const hasBottomLabel = this.showValueBelow();

    const vertical = (atLabel: boolean, side: PortSide) =>
      atLabel ? -LABEL_PAD : sides.has(side) ? PORT_RADIUS : -SELECTION_PAD;
    const horizontal = (side: PortSide) => (sides.has(side) ? PORT_RADIUS : -SELECTION_PAD);

    const top = vertical(hasTopLabel, 'top');
    const bottom = vertical(hasBottomLabel, 'bottom');
    return `${top}px ${horizontal('right')}px ${bottom}px ${horizontal('left')}px`;
  });

  protected readonly symbolStyle = computed(() => {
    const { width, height } = getSymbolSize(this.def());
    return { width: `${width}px`, height: `${height}px` };
  });

  protected readonly showValueAbove = computed(
    () => !!this.def().valueAbove && !!this.data().value,
  );
  protected readonly showValueBelow = computed(
    () => !this.def().valueAbove && this.def().valueLabel !== null && !!this.data().value,
  );

  protected onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const id = this.node().id;
    this.actions.selectOnly(id);
    this.contextMenu.openForNode(event.clientX, event.clientY, id);
  }
}

/** Radius (node-local px) of ng-diagram's default port box. */
const PORT_RADIUS = 4;

/** Breathing room (node-local px) on outline sides without a port or label. */
const SELECTION_PAD = 10;

/** Extra room (node-local px) outside a label-bearing side. */
const LABEL_PAD = 6;

function sideOffsetX(side: PortSide): number {
  if (side === 'left') return PORT_RADIUS;
  if (side === 'right') return -PORT_RADIUS;
  return 0;
}

function sideOffsetY(side: PortSide): number {
  if (side === 'top') return PORT_RADIUS;
  if (side === 'bottom') return -PORT_RADIUS;
  return 0;
}
