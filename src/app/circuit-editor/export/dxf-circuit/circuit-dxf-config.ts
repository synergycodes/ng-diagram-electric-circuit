import { CIRCUIT_NODE_TYPE, WIRE_EDGE_TYPE } from '../../diagram/model/component-types';
import { JUNCTION_NODE_TYPE } from '../../diagram/wire/junction/model';
import { DxfLayer } from '../dxf/dxf-layer';
import { DxfTextStyle } from '../dxf/dxf-text-style';
import type { DxfExportConfig } from '../dxf/dxf-types';
import { renderCircuitNode } from './circuit-node-renderer';
import {
  ACI,
  DIAGRAM_PADDING,
  DXF_SCALE_MM_PER_PX,
  LAYERS,
  TEXT_STYLE,
} from './circuit-dxf-constants';
import { renderJunctionNode } from './junction-node-renderer';
import { renderWireEdge } from './wire-edge-renderer';

/**
 * Wires the circuit editor's renderers into the generic DxfExporter.
 *
 * To support a new node or edge type:
 *   1. Write a renderer function (see circuit-node-renderer.ts as a model).
 *   2. Register it here under the matching `node.type` / `edge.type` key.
 * Nothing in the generic `dxf/` library needs to change.
 */
export const buildCircuitDxfConfig = (): DxfExportConfig => ({
  scaleMmPerPx: DXF_SCALE_MM_PER_PX,
  paddingPx: DIAGRAM_PADDING,
  layers: [
    new DxfLayer(LAYERS.COMPONENTS, ACI.WHITE),
    new DxfLayer(LAYERS.WIRES, ACI.WHITE),
    new DxfLayer(LAYERS.LABELS, ACI.WHITE),
  ],
  textStyles: [new DxfTextStyle(TEXT_STYLE.STANDARD), new DxfTextStyle(TEXT_STYLE.BOLD, true)],
  nodeRenderers: {
    [CIRCUIT_NODE_TYPE]: renderCircuitNode,
    [JUNCTION_NODE_TYPE]: renderJunctionNode,
  },
  edgeRenderers: {
    [WIRE_EDGE_TYPE]: renderWireEdge,
  },
});
