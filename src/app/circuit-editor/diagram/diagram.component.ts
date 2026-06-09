import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  createMiddlewares,
  initializeModel,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramEdgeTemplateMap,
  NgDiagramModelService,
  NgDiagramNodeTemplateMap,
  NgDiagramService,
  NgDiagramViewportService,
  type Edge,
  type EdgeDrawEndedEvent,
  type NgDiagramConfig,
  type Node,
  type Port,
  type PaletteItemDroppedEvent,
  type SelectionGestureEndedEvent,
  type SelectionMovedEvent,
  type SelectionRemovedEvent,
} from 'ng-diagram';
import { CIRCUIT_EDITOR_CONFIG } from '../circuit-editor.config';
import { ContextMenuService } from '../context-menu/context-menu.service';
import { PropertiesSidebarService } from '../properties-sidebar/properties-sidebar.service';
import { diagramModel } from './data';
import { applyDeleteCleanup } from './junction/delete-cleanup';
import { applyEdgeStretchOnSelectionMoved } from './junction/edge-stretch';
import { BranchFromWireOverlayComponent } from './junction/branch-from-wire-overlay.component';
import { EdgeReshapeOverlayComponent } from './junction/edge-reshape-overlay.component';
import { JunctionNodeComponent } from './junction/junction-node.component';
import { JUNCTION_NODE_TYPE, JUNCTION_SIZE_PX } from './junction/junction-model';
import { createJunctionPortRoutingMiddleware } from './junction/junction-port-routing.middleware';
import { JunctionTopologyService } from './junction/junction-topology.service';
import { LinkDropPreviewOverlayComponent } from './junction/link-drop-preview-overlay.component';
import { COMPONENT_CATALOG, GRID_UNIT, isAutoNumbered } from './model/component-catalog';
import { CIRCUIT_NODE_TYPE, WIRE_EDGE_TYPE, type CircuitNodeData } from './model/component-types';
import { ConnectivityService } from './model/connectivity.service';
import { isCircuitNode, portHasConnection } from './model/guards';
import { CircuitNodeComponent } from './node/circuit-node.component';
import { WireComponent } from './wire/wire.component';

/**
 * Circuit editor canvas.
 *
 * Hosts the ng-diagram surface with a single circuit-node template (the kind is
 * carried in node data) and a wire edge template. Components are placed by
 * dragging tiles from the library palette; this component assigns each dropped
 * node a unique reference designator.
 */
@Component({
  selector: 'app-diagram',
  imports: [
    NgDiagramComponent,
    NgDiagramBackgroundComponent,
    EdgeReshapeOverlayComponent,
    LinkDropPreviewOverlayComponent,
    BranchFromWireOverlayComponent,
  ],
  templateUrl: './diagram.component.html',
  styleUrl: './diagram.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [JunctionTopologyService],
})
export class DiagramComponent {
  private readonly config = inject(CIRCUIT_EDITOR_CONFIG);
  private readonly viewportService = inject(NgDiagramViewportService);
  private readonly modelService = inject(NgDiagramModelService);
  private readonly ngDiagramService = inject(NgDiagramService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly sidebarService = inject(PropertiesSidebarService);
  private readonly contextMenu = inject(ContextMenuService);
  private readonly topology = inject(JunctionTopologyService);

  diagramConfig = {
    linking: {
      // A node port holds at most one wire: reject a connection whose source or
      // target circuit-node port is already wired (and self-connections).
      // Junction ports are exempt — the topology layer manages their fan-out.
      validateConnection: (
        source: Node | null,
        sourcePort: Port | null,
        target: Node | null,
        targetPort: Port | null,
      ) => {
        if (!source || !target || !sourcePort || !targetPort) return false;
        // A port may not wire to itself, but two ports on the same component may
        // be wired together (e.g. NE555 pin 2 ↔ pin 6).
        if (source.id === target.id && sourcePort.id === targetPort.id) return false;
        const edges = this.modelService.edges();
        if (isCircuitNode(source) && portHasConnection(edges, source.id, sourcePort.id))
          return false;
        if (isCircuitNode(target) && portHasConnection(edges, target.id, targetPort.id))
          return false;
        return true;
      },
      // Wires carry no arrowheads (a schematic connection, not a directed edge).
      // Strip them from both the drag preview and the finalized edge.
      temporaryEdgeDataBuilder: (edge: Edge) => ({
        ...edge,
        type: WIRE_EDGE_TYPE,
        data: { kind: 'wire' },
        sourceArrowhead: undefined,
        targetArrowhead: undefined,
      }),
      finalEdgeDataBuilder: (edge: Edge) => ({
        ...edge,
        type: WIRE_EDGE_TYPE,
        data: { kind: 'wire' },
        sourceArrowhead: undefined,
        targetArrowhead: undefined,
      }),
    },
    // Orthogonal wires with sharp (un-rounded) corners — no curvature.
    edgeRouting: {
      defaultRouting: 'orthogonal',
      orthogonal: {
        maxCornerRadius: 0,
        // Zero so wires meeting at a junction port don't get a forced detour.
        firstLastSegmentLength: 0,
      },
    },
    // Grid background: 8-unit minor cells, a major line every 10 minor cells.
    background: {
      cellSize: { width: 8, height: 8 },
      majorLinesFrequency: { x: 10, y: 10 },
    },
    // Nodes snap to the minor (8-unit) grid while dragging.
    snapping: {
      shouldSnapDragForNode: () => true,
      defaultDragSnap: { width: 8, height: 8 },
    },
    // Junction nodes are 8-px anchors — exempt them from the default 20-px
    // minimum so the dot stays centred on the wire (otherwise the node grows
    // to 20 px and its centre drifts off the connection point).
    resize: {
      getMinNodeSize: (node: Node) =>
        node.type === JUNCTION_NODE_TYPE
          ? { width: JUNCTION_SIZE_PX, height: JUNCTION_SIZE_PX }
          : { width: 16, height: 16 },
    },
    watermarkPosition: 'bottom-left',
    zIndex: {
      elevateOnSelection: true,
    },
    // Free rotation (via the node handle) snaps to 45° increments.
    nodeRotation: {
      shouldSnapForNode: () => true,
      defaultSnapAngle: 45,
    },
  } satisfies NgDiagramConfig;

  nodeTemplateMap = new NgDiagramNodeTemplateMap([
    [CIRCUIT_NODE_TYPE, CircuitNodeComponent],
    [JUNCTION_NODE_TYPE, JunctionNodeComponent],
  ]);
  edgeTemplateMap = new NgDiagramEdgeTemplateMap([[WIRE_EDGE_TYPE, WireComponent]]);

  // Reassign junction-side ports so wires don't leave a junction collinear.
  middlewares = createMiddlewares((defaults) => [
    ...defaults,
    createJunctionPortRoutingMiddleware(),
  ]);

  model = initializeModel(diagramModel);

  onDiagramInit(): void {
    this.zoomToFit();
  }

  /**
   * A wire whose endpoint was dropped on empty canvas. If it landed on an
   * existing wire (or near a junction), create/attach a junction there;
   * otherwise leave it dangling at the drop point.
   */
  onEdgeDrawEnded(event: EdgeDrawEndedEvent): void {
    this.topology.handleEdgeDrawDrop(event);
  }

  /**
   * Keep manual-routed wires (reshaped wires, junction halves) attached to their
   * ports while a connected node is dragged — ng-diagram only re-routes `auto`
   * edges on a move, so without this a reshaped wire would detach.
   */
  onSelectionMoved(event: SelectionMovedEvent): void {
    const movedNodeIds = new Set(event.nodes.map((node) => node.id));
    const incident = this.connectivity.incidentEdges(movedNodeIds);
    applyEdgeStretchOnSelectionMoved(this.modelService, incident);
  }

  /** After a delete, drop orphaned junctions and merge any passthroughs. */
  onSelectionRemoved(event: SelectionRemovedEvent): void {
    applyDeleteCleanup(
      { modelService: this.modelService, ngDiagramService: this.ngDiagramService },
      event,
    );
  }

  /** Give each component dropped from the palette a unique reference designator. */
  onPaletteItemDropped(event: PaletteItemDroppedEvent): void {
    const node = event.node;
    if (!isCircuitNode(node)) return;

    // ng-diagram drops the node with its top-left at the cursor; recentre it on
    // the cursor (matching the centred drag preview) and re-snap to the grid so
    // ports stay grid-aligned.
    if (node.size) {
      const centered = {
        x: snapToGridUnit(node.position.x - node.size.width / 2),
        y: snapToGridUnit(node.position.y - node.size.height / 2),
      };
      if (centered.x !== node.position.x || centered.y !== node.position.y) {
        this.modelService.updateNode(node.id, { position: centered });
      }
    }

    const reference = this.nextReference(node.data, node.id);
    if (reference !== node.data.reference) {
      this.modelService.updateNodeData<CircuitNodeData>(node.id, { ...node.data, reference });
    }
  }

  /** Open the properties sidebar whenever a component is selected. */
  onSelectionGestureEnded(event: SelectionGestureEndedEvent): void {
    if (event.nodes.some(isCircuitNode)) {
      this.sidebarService.expandSidebar();
    }
  }

  /** Right-click on empty canvas → background context menu (paste only). */
  onBackgroundContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenu.openForBackground(event.clientX, event.clientY);
  }

  /** Computes the next free designator (R1, R2…) for auto-numbered components. */
  private nextReference(data: CircuitNodeData, ownId: string): string {
    const def = COMPONENT_CATALOG[data.componentType];
    if (!isAutoNumbered(data.componentType)) {
      return def.refPrefix;
    }

    const prefix = def.refPrefix;
    const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);
    let max = 0;
    for (const node of this.modelService.nodes()) {
      if (node.id === ownId || !isCircuitNode(node)) continue;
      if (node.data.componentType !== data.componentType) continue;
      const match = node.data.reference.match(pattern);
      if (match) {
        max = Math.max(max, Number(match[1]));
      }
    }
    return `${prefix}${max + 1}`;
  }

  private zoomToFit(): void {
    const pad = this.config.viewport.zoomToFitPadding;
    // Extra room on each side keeps the schematic clear of the overlay panels.
    this.viewportService.zoomToFit({ padding: [pad + 24, pad + 280, pad + 48, pad + 260] });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function snapToGridUnit(value: number): number {
  return Math.round(value / GRID_UNIT) * GRID_UNIT;
}
