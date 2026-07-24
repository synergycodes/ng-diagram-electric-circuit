// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Edge, Node } from 'ng-diagram';
import {
  createNodeData,
  getNodeSize,
  COMPONENT_CATALOG,
} from '../../diagram/model/component-catalog';
import {
  CIRCUIT_NODE_TYPE,
  ComponentType,
  WIRE_EDGE_TYPE,
} from '../../diagram/model/component-types';
import { JUNCTION_NODE_TYPE } from '../../diagram/wire/junction/model';
import { DxfExporter } from '../dxf/dxf-exporter';
import { DxfWriter } from '../dxf/dxf-writer';
import { buildCircuitDxfConfig } from './circuit-dxf-config';

const circuitNode = (id: string, type: ComponentType, x: number, y: number, angle = 0): Node => {
  const size = getNodeSize(COMPONENT_CATALOG[type]);
  return {
    id,
    type: CIRCUIT_NODE_TYPE,
    position: { x, y },
    size,
    angle,
    data: createNodeData(type),
  } as unknown as Node;
};

const junctionNode = (id: string, x: number, y: number): Node =>
  ({
    id,
    type: JUNCTION_NODE_TYPE,
    position: { x, y },
    size: { width: 8, height: 8 },
    data: { kind: 'junction' },
  }) as unknown as Node;

const wire = (id: string, points: { x: number; y: number }[]): Edge =>
  ({
    id,
    type: WIRE_EDGE_TYPE,
    source: 'a',
    target: 'b',
    points,
    data: { kind: 'wire' },
  }) as unknown as Edge;

const serialize = (nodes: Node[], edges: Edge[]): string => {
  const bounds = { x: 0, y: 0, width: 600, height: 400 };
  const doc = new DxfExporter(buildCircuitDxfConfig()).export(nodes, edges, bounds);
  return new DxfWriter().serialize(doc);
};

const layersOfEntity = (dxf: string, entity: string): string[] => {
  const lines = dxf.split('\n');
  const layers: string[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() === '0' && lines[i + 1] === entity) {
      // Scan forward for this record's group 8 (layer).
      for (let j = i + 2; j < lines.length - 1; j += 2) {
        if (lines[j].trim() === '0') break;
        if (lines[j].trim() === '8') {
          layers.push(lines[j + 1]);
          break;
        }
      }
    }
  }
  return layers;
};

describe('circuit DXF export', () => {
  const nodes = [
    circuitNode('r1', ComponentType.Resistor, 100, 100),
    circuitNode('u1', ComponentType.Ne555, 300, 100),
    circuitNode('q1', ComponentType.TransistorNpn, 200, 260, 90),
    junctionNode('j1', 160, 160),
  ];
  const edges = [
    wire('w1', [
      { x: 220, y: 118 },
      { x: 300, y: 118 },
    ]),
  ];

  it('produces well-framed DXF (even code/value line count)', () => {
    const dxf = serialize(nodes, edges);
    expect(dxf.split('\n').length % 2).toBe(0);
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('TEXT');
    expect(dxf.startsWith('  0\nSECTION')).toBe(true);
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
  });

  it('places components, wires, junctions and labels on their own layers', () => {
    const dxf = serialize(nodes, edges);
    const polyLayers = new Set(layersOfEntity(dxf, 'LWPOLYLINE'));
    const textLayers = new Set(layersOfEntity(dxf, 'TEXT'));
    expect(polyLayers.has('COMPONENTS')).toBe(true); // symbol geometry
    expect(polyLayers.has('WIRES')).toBe(true); // wire + junction dot
    expect(textLayers.has('LABELS')).toBe(true); // reference / value / pins
  });

  it('renders a reference designator as TEXT', () => {
    const dxf = serialize(nodes, edges);
    // createNodeData gives the resistor reference "R1".
    expect(dxf).toContain('\nR1');
  });

  it('warns for unregistered types but still exports the rest', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const unknown = {
      id: 'x',
      type: 'mystery',
      position: { x: 0, y: 0 },
      data: {},
    } as unknown as Node;
    const dxf = serialize([nodes[0], unknown], []);
    expect(dxf).toContain('LWPOLYLINE');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('mystery'));
    warn.mockRestore();
  });
});
