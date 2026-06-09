import { type Edge, type Node } from 'ng-diagram';
import { COMPONENT_CATALOG, getNodeSize } from './model/component-catalog';
import {
  CIRCUIT_NODE_TYPE,
  ComponentType,
  WIRE_EDGE_TYPE,
  type CircuitEdgeData,
  type CircuitNodeData,
} from './model/component-types';

interface SeedNode {
  id: string;
  type: ComponentType;
  position: { x: number; y: number };
  reference: string;
  value?: string;
  description?: string;
  specs?: Record<string, string>;
}

const seedNodes: SeedNode[] = [
  {
    id: 'bat1',
    type: ComponentType.Battery,
    position: { x: 0, y: 224 },
    reference: 'BAT1',
    value: '9V',
    description: 'Main supply',
  },
  {
    id: 'v1',
    type: ComponentType.VoltageSource,
    position: { x: 304, y: 0 },
    reference: '+5V',
    description: 'Regulated rail',
    specs: { net: 'VCC' },
  },
  {
    id: 'r1',
    type: ComponentType.Resistor,
    position: { x: 224, y: 128 },
    reference: 'R1',
    value: '1kΩ',
    description: 'LED current limiter',
  },
  {
    id: 'c1',
    type: ComponentType.Capacitor,
    position: { x: 232, y: 344 },
    reference: 'C1',
    value: '100µF',
    description: 'Smoothing capacitor',
  },
  {
    id: 'led1',
    type: ComponentType.Led,
    position: { x: 440, y: 208 },
    reference: 'LED1',
    value: 'Red',
    description: 'Power indicator',
  },
  {
    id: 'u1',
    type: ComponentType.Ne555,
    position: { x: 664, y: 72 },
    reference: 'U1',
    value: 'NE555',
    description: 'Astable timer',
  },
  {
    id: 'gnd1',
    type: ComponentType.Ground,
    position: { x: 312, y: 440 },
    reference: 'GND',
    specs: { net: 'GND' },
  },
];

function buildNode(seed: SeedNode): Node<CircuitNodeData> {
  const def = COMPONENT_CATALOG[seed.type];
  return {
    id: seed.id,
    position: seed.position,
    type: CIRCUIT_NODE_TYPE,
    size: getNodeSize(def),
    autoSize: false,
    data: {
      label: def.label,
      componentType: seed.type,
      reference: seed.reference,
      value: seed.value ?? def.defaultValue,
      description: seed.description ?? '',
      specs: { ...def.defaultSpecs, ...seed.specs },
    },
  };
}

interface SeedWire {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}

const seedWires: SeedWire[] = [
  { id: 'w1', source: 'bat1', sourcePort: 'p2', target: 'r1', targetPort: 'p1' },
  { id: 'w2', source: 'v1', sourcePort: 'p1', target: 'r1', targetPort: 'p1' },
  { id: 'w3', source: 'r1', sourcePort: 'p2', target: 'led1', targetPort: 'p1' },
  { id: 'w4', source: 'led1', sourcePort: 'p2', target: 'u1', targetPort: 'p14' },
  { id: 'w5', source: 'c1', sourcePort: 'p2', target: 'gnd1', targetPort: 'p1' },
  { id: 'w6', source: 'bat1', sourcePort: 'p1', target: 'c1', targetPort: 'p1' },
];

function buildWire(seed: SeedWire): Edge<CircuitEdgeData> {
  return {
    id: seed.id,
    source: seed.source,
    sourcePort: seed.sourcePort,
    target: seed.target,
    targetPort: seed.targetPort,
    type: WIRE_EDGE_TYPE,
    data: { kind: 'wire' },
  };
}

export const diagramModel: {
  nodes: Node<CircuitNodeData>[];
  edges: Edge<CircuitEdgeData>[];
} = {
  nodes: seedNodes.map(buildNode),
  edges: seedWires.map(buildWire),
};
