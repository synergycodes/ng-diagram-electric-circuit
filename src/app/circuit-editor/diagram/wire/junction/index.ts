// Junction sub-domain — the schematic "solder dot" node plus the topology that
// creates / splits / merges junctions, keeps their ports from overlapping, and
// cleans up orphans after a delete. The foundation wire interactions build on;
// depends only on wire/geometry.

export {
  JUNCTION_NODE_TYPE,
  JUNCTION_SIZE_PX,
  JUNCTION_PORT_IDS,
  isJunctionNode,
  junctionCentre,
  type JunctionNodeData,
  type JunctionPortId,
} from './model';
export { JunctionNodeComponent } from './node.component';
export { JunctionTopologyService } from './topology/topology.service';
export { applyDeleteCleanup } from './topology/delete-cleanup';
export { createJunctionPortRoutingMiddleware } from './routing/port-routing.middleware';
export * from './config';
