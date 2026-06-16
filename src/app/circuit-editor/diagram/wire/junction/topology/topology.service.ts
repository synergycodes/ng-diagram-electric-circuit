import { Injectable, inject } from '@angular/core';
import {
  NgDiagramModelService,
  NgDiagramService,
  type EdgeDrawEndedEvent,
  type Node,
  type Point,
} from 'ng-diagram';
import { WIRE_EDGE_TYPE, type CircuitEdgeData } from '../../../model/component-types';
import { isCircuitNode, portHasConnection } from '../../../model/guards';
import { endpointWorldPosition, mergeJunctionHalves, reconcileJunction } from './cleanup';
import {
  findEdgeSplitHit,
  portWorldPosition,
  splitPolylineAt,
  type EdgeSplitHit,
} from '../../geometry';
import {
  JUNCTION_NODE_TYPE,
  JUNCTION_PORT_IDS,
  JUNCTION_SIZE_PX,
  mintFormerParentId,
  mintJunctionId,
  mintWireId,
  pickJunctionPortId,
  type JunctionPortId,
} from '../model';
import {
  defaultHalfFallback,
  junctionNodeAt,
  junctionPortWorld,
  junctionWorldCentre,
  pickBranchPortAvoidingHalves,
} from '../geometry';
import { PORT_SNAP_PX, SPLIT_HIT_TOLERANCE_PX, SPLIT_SNAP_GRID_PX } from '../config';

// The wire being drawn, identified by the port it started from.
interface BranchEdgeSpec {
  readonly sourceId: string;
  readonly sourcePort: string;
}

// Result of materialising a junction split: the new node plus the geometry a
// caller needs to attach its own branch.
interface JunctionSplit {
  readonly junctionId: string;
  readonly centre: Point;
  readonly splitAxis: 'horizontal' | 'vertical';
  readonly halfPorts: readonly JunctionPortId[];
}

// Atomic ops on the wire/junction graph: attach, split, branch. Owns no state —
// reads and mutates the diagram model directly.
@Injectable()
export class JunctionTopologyService {
  private readonly modelService = inject(NgDiagramModelService);
  private readonly ngDiagramService = inject(NgDiagramService);

  findNearbyJunction(point: Point, range: number): Node | null {
    let best: Node | null = null;
    let bestDistSq = range * range;
    for (const node of this.modelService.nodes()) {
      if (node.type !== JUNCTION_NODE_TYPE || !node.size) continue;
      const cx = node.position.x + node.size.width / 2;
      const cy = node.position.y + node.size.height / 2;
      const dx = cx - point.x;
      const dy = cy - point.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= bestDistSq) {
        bestDistSq = distSq;
        best = node;
      }
    }
    return best;
  }

  // A wire dropped without a target only becomes a junction when it lands on
  // existing wiring: nearby junction → attach; over a wire → split. Dropping on
  // empty canvas is a no-op (ng-diagram discards the half-drawn wire), matching
  // the editor's prior behaviour. The junction is checked first so
  // `findEdgeSplitHit` doesn't match a branch already incident to it and spawn a
  // duplicate.
  handleEdgeDrawDrop(event: EdgeDrawEndedEvent): void {
    if (event.success) return;
    if (event.reason !== 'noTarget') return;
    if (!event.sourcePort) return;

    const branch: BranchEdgeSpec = {
      sourceId: event.source.id,
      sourcePort: event.sourcePort,
    };

    const nearbyJunction = this.findNearbyJunction(event.dropPosition, JUNCTION_SIZE_PX);
    if (nearbyJunction) {
      this.attachToJunction(branch, nearbyJunction);
      return;
    }

    const hit = findEdgeSplitHit(
      this.modelService.edges(),
      event.dropPosition,
      SPLIT_HIT_TOLERANCE_PX,
      SPLIT_SNAP_GRID_PX,
    );
    if (hit) {
      this.splitEdgeAtHit(branch, hit);
    }
  }

  attachToJunction(branch: BranchEdgeSpec, junction: Node): void {
    const centre = junctionWorldCentre(junction);
    const branchOtherEnd = this.branchSourcePortWorld(branch);
    const portId = branchOtherEnd
      ? pickJunctionPortId(centre, branchOtherEnd)
      : JUNCTION_PORT_IDS.top;
    this.applyBranch(branch, junction.id, portId);
  }

  // Split `hit.edge` at the drop point and connect `branch` (a port-initiated
  // draw) to the new junction.
  splitEdgeAtHit(branch: BranchEdgeSpec, hit: EdgeSplitHit): void {
    if (!hit.edge.points || hit.edge.points.length < 2) return;
    const branchOtherEnd = this.branchSourcePortWorld(branch);
    this.ngDiagramService.transaction(() => {
      const split = this.materializeJunctionSplit(hit);
      const port = pickBranchPortAvoidingHalves(
        split.splitAxis,
        split.centre,
        branchOtherEnd,
        new Set(split.halfPorts),
      );
      this.applyBranch(branch, split.junctionId, port);
    });
  }

  // ---- Branch started FROM a wire (the hover-handle gesture) ---------------

  // Split the hovered wire and pull out a fresh dangling branch from the new
  // junction toward `branchEndWorld` (the cursor). Returns the ids so the
  // overlay can drag and finalise it. Null when the wire has no polyline.
  beginWireBranch(
    hit: EdgeSplitHit,
    branchEndWorld: Point,
  ): { junctionId: string; branchEdgeId: string } | null {
    if (!hit.edge.points || hit.edge.points.length < 2) return null;
    const branchEdgeId = mintWireId();
    let junctionId = '';
    this.ngDiagramService.transaction(() => {
      const split = this.materializeJunctionSplit(hit);
      junctionId = split.junctionId;
      const port = pickBranchPortAvoidingHalves(
        split.splitAxis,
        split.centre,
        branchEndWorld,
        new Set(split.halfPorts),
      );
      this.modelService.addEdges([
        {
          id: branchEdgeId,
          type: WIRE_EDGE_TYPE,
          source: junctionId,
          sourcePort: port,
          target: '',
          targetPosition: branchEndWorld,
          routingMode: 'auto',
          data: { kind: 'wire' } satisfies CircuitEdgeData,
        },
      ]);
    });
    return { junctionId, branchEdgeId };
  }

  /** Track the dragged branch's free end to the cursor. */
  dragWireBranch(branchEdgeId: string, world: Point): void {
    this.modelService.updateEdge(branchEdgeId, { targetPosition: world });
  }

  // Resolve the branch on release: nearby junction → free port → split another
  // wire (nested junction) → cancel (delete the branch and merge the split-open
  // wire back together).
  endWireBranch(branchEdgeId: string, junctionId: string, releaseWorld: Point): void {
    const sourceCentre = this.junctionCentreOf(junctionId) ?? releaseWorld;

    const nearJunction = this.findNearbyJunction(releaseWorld, JUNCTION_SIZE_PX);
    if (nearJunction && nearJunction.id !== junctionId) {
      const port = pickJunctionPortId(junctionWorldCentre(nearJunction), sourceCentre);
      this.modelService.updateEdge(branchEdgeId, {
        target: nearJunction.id,
        targetPort: port,
        targetPosition: undefined,
      });
      return;
    }

    const port = this.modelService.getNearestPortInRange(releaseWorld, PORT_SNAP_PX);
    if (port && port.nodeId !== junctionId) {
      const node = this.modelService.getNodeById(port.nodeId);
      if (
        isCircuitNode(node) &&
        !portHasConnection(this.modelService.edges(), port.nodeId, port.id)
      ) {
        this.modelService.updateEdge(branchEdgeId, {
          target: port.nodeId,
          targetPort: port.id,
          targetPosition: undefined,
        });
        return;
      }
    }

    // Don't split the branch itself or the two halves of its own junction.
    const exclude = new Set<string>([
      branchEdgeId,
      ...this.modelService.getConnectedEdges(junctionId).map((edge) => edge.id),
    ]);
    const candidates = this.modelService.edges().filter((edge) => !exclude.has(edge.id));
    const hit = findEdgeSplitHit(
      candidates,
      releaseWorld,
      SPLIT_HIT_TOLERANCE_PX,
      SPLIT_SNAP_GRID_PX,
    );
    if (hit) {
      this.ngDiagramService.transaction(() => {
        const split = this.materializeJunctionSplit(hit);
        const nestedPort = pickBranchPortAvoidingHalves(
          split.splitAxis,
          split.centre,
          sourceCentre,
          new Set(split.halfPorts),
        );
        this.modelService.updateEdge(branchEdgeId, {
          target: split.junctionId,
          targetPort: nestedPort,
          targetPosition: undefined,
        });
      });
      return;
    }

    // Cancel: remove the branch and merge the junction's two halves back into
    // the original wire. Capture the halves *before* deleting (so the merge
    // doesn't depend on the delete having flushed); fall back to reconcile if
    // the topology isn't the expected two-halves shape.
    const halves = this.modelService
      .getConnectedEdges(junctionId)
      .filter((edge) => edge.id !== branchEdgeId);
    this.modelService.deleteEdges([branchEdgeId]);
    if (halves.length === 2) {
      mergeJunctionHalves(
        this.modelService,
        this.ngDiagramService,
        junctionId,
        halves[0],
        halves[1],
      );
    } else {
      reconcileJunction(this.modelService, this.ngDiagramService, junctionId);
    }
  }

  // --------------------------------------------------------------------------

  // Materialise a junction at `hit.snapPoint`, deleting the parent edge and
  // adding two `manual` halves that inherit its polyline. MUST run inside a
  // transaction. Returns the junction id + the geometry needed to place a branch.
  private materializeJunctionSplit(hit: EdgeSplitHit): JunctionSplit {
    const parentEdge = hit.edge;
    const points = parentEdge.points!;
    const junctionId = mintJunctionId();
    const centre = hit.snapPoint;

    const { firstHalf, secondHalf } = splitPolylineAt(points, hit.segmentIndex, hit.snapPoint);

    // Pick ports from each half's neighbour direction (not splitAxis) so a
    // seam-at-bend lands on the right axis. Collision fallback uses splitAxis
    // defaults — rare U-shape case.
    const segStart = points[hit.segmentIndex];
    const segEnd = points[hit.segmentIndex + 1];
    const splitAxis: 'horizontal' | 'vertical' =
      Math.abs(segStart.y - segEnd.y) < Math.abs(segStart.x - segEnd.x) ? 'horizontal' : 'vertical';
    const halfANeighbour = firstHalf[firstHalf.length - 2];
    const halfBNeighbour = secondHalf[1];
    let halfASidePort = pickJunctionPortId(centre, halfANeighbour);
    let halfBSidePort = pickJunctionPortId(centre, halfBNeighbour);
    if (halfASidePort === halfBSidePort) {
      halfASidePort = defaultHalfFallback(splitAxis, 'a');
      halfBSidePort = defaultHalfFallback(splitAxis, 'b');
    }

    // Slide seam endpoints from `snap` onto the actual port coords.
    const halfAPortWorld = junctionPortWorld(centre, halfASidePort);
    const halfBPortWorld = junctionPortWorld(centre, halfBSidePort);
    firstHalf[firstHalf.length - 1] = { x: halfAPortWorld.x, y: halfAPortWorld.y };
    secondHalf[0] = { x: halfBPortWorld.x, y: halfBPortWorld.y };

    const formerParentId = mintFormerParentId();

    this.modelService.addNodes([junctionNodeAt(centre, junctionId)]);
    this.modelService.deleteEdges([parentEdge.id]);
    this.modelService.addEdges([
      {
        id: mintWireId(),
        type: WIRE_EDGE_TYPE,
        source: parentEdge.source,
        sourcePort: parentEdge.sourcePort,
        sourcePosition: parentEdge.source === '' ? parentEdge.sourcePosition : undefined,
        target: junctionId,
        targetPort: halfASidePort,
        routingMode: 'manual',
        points: firstHalf,
        data: { kind: 'wire', formerParentId } satisfies CircuitEdgeData,
      },
      {
        id: mintWireId(),
        type: WIRE_EDGE_TYPE,
        source: junctionId,
        sourcePort: halfBSidePort,
        target: parentEdge.target,
        targetPort: parentEdge.targetPort,
        targetPosition: parentEdge.target === '' ? parentEdge.targetPosition : undefined,
        routingMode: 'manual',
        points: secondHalf,
        data: { kind: 'wire', formerParentId } satisfies CircuitEdgeData,
      },
    ]);

    return { junctionId, centre, splitAxis, halfPorts: [halfASidePort, halfBSidePort] };
  }

  private applyBranch(branch: BranchEdgeSpec, junctionId: string, port: JunctionPortId): void {
    this.modelService.addEdges([
      {
        id: mintWireId(),
        type: WIRE_EDGE_TYPE,
        source: branch.sourceId,
        sourcePort: branch.sourcePort,
        target: junctionId,
        targetPort: port,
        data: { kind: 'wire' } satisfies CircuitEdgeData,
      },
    ]);
  }

  // World position of the branch's source PORT, so the junction port faces the
  // real pin (not the node bbox centre, which mis-routes multi-pin parts). Falls
  // back to the bbox centre only when the port is not yet measured.
  private branchSourcePortWorld(branch: BranchEdgeSpec): Point | null {
    const node = this.modelService.getNodeById(branch.sourceId);
    return (
      portWorldPosition(node ?? null, branch.sourcePort) ??
      endpointWorldPosition(this.modelService, branch.sourceId, undefined)
    );
  }

  private junctionCentreOf(junctionId: string): Point | null {
    const node = this.modelService.getNodeById(junctionId);
    return node ? junctionWorldCentre(node) : null;
  }
}
