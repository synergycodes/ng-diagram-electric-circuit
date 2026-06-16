import type { PortSide } from 'ng-diagram';

/** ng-diagram node `type` shared by every circuit component (one template). */
export const CIRCUIT_NODE_TYPE = 'circuitNode';

/** ng-diagram edge `type` for wires connecting component ports. */
export const WIRE_EDGE_TYPE = 'wire';

/** Kinds of schematic components available in the editor. */
export enum ComponentType {
  Resistor = 'resistor',
  Capacitor = 'capacitor',
  Inductor = 'inductor',
  Potentiometer = 'potentiometer',
  Fuse = 'fuse',
  Crystal = 'crystal',
  Diode = 'diode',
  Led = 'led',
  ZenerDiode = 'zener-diode',
  TransistorNpn = 'transistor-npn',
  TransistorPnp = 'transistor-pnp',
  Ne555 = 'ne555',
  Switch = 'switch',
  PushButton = 'push-button',
  Battery = 'battery',
  VoltageSource = 'voltage-source',
  Ground = 'ground',
}

/** Library grouping shown as collapsible sections in the component sidebar. */
export enum ComponentCategory {
  Passive = 'Passive',
  Semiconductors = 'Semiconductors',
  IntegratedCircuits = 'Integrated circuits',
  Electromechanical = 'Electromechanical',
  PowerGround = 'Power & Ground',
}

/**
 * A single connection point on a component, positioned as a fraction of the
 * symbol box (0..1). `side` tells ng-diagram which edge the wire leaves from.
 */
export interface PortDef {
  id: string;
  side: PortSide;
  /** Horizontal position within the symbol box (0 = left, 1 = right). */
  cx: number;
  /** Vertical position within the symbol box (0 = top, 1 = bottom). */
  cy: number;
  /** Optional pin number rendered inside the symbol (used by ICs). */
  pin?: string;
}

/** Editable specification field shown in the properties sidebar. */
export interface SpecFieldDef {
  key: string;
  label: string;
  placeholder?: string;
}

/** Static metadata describing how to render and configure one component kind. */
export interface ComponentDefinition {
  type: ComponentType;
  /** Display name (tile label, "Type" field, sidebar subtitle). */
  label: string;
  category: ComponentCategory;
  /** Reference-designator prefix used when auto-naming dropped nodes. */
  refPrefix: string;
  /** Symbol box size in flow units. The node size equals this plus label rows. */
  symbol: { width: number; height: number };
  ports: PortDef[];
  /** Connection terminals (ports.length); informational. */
  /** Label for the headline value field, e.g. "Resistance". Null hides it. */
  valueLabel: string | null;
  /** Default headline value (rendered under, or for ICs above, the symbol). */
  defaultValue: string;
  /** When true the value is rendered directly beneath the reference (above the
   *  symbol) instead of below it — used by ICs such as the NE555. */
  valueAbove?: boolean;
  /** Additional editable specification fields beyond the headline value. */
  specFields: SpecFieldDef[];
  /** Default values for the extra spec fields. */
  defaultSpecs: Record<string, string>;
}

/** Per-node persisted data. */
export interface CircuitNodeData {
  /** Human-readable component name (also satisfies ng-diagram's palette item). */
  label: string;
  componentType: ComponentType;
  /** Reference designator shown above the symbol (e.g. "R1", "U1", "GND"). */
  reference: string;
  /** Headline value shown beside the symbol (e.g. "10kΩ", "9V"). */
  value: string;
  description: string;
  /** Extra specification values keyed by SpecFieldDef.key. */
  specs: Record<string, string>;
}

/** Per-wire persisted data. */
export interface CircuitEdgeData {
  kind: 'wire';
  /**
   * Shared by the two halves of a wire that was split by a junction, so cleanup
   * can merge them back into one wire when the junction's degree drops. Absent
   * on ordinary wires and on independent branches meeting at a junction.
   */
  formerParentId?: string;
}
