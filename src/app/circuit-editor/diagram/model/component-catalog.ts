import type { NgDiagramPaletteItem, Size } from 'ng-diagram';
import {
  CIRCUIT_NODE_TYPE,
  ComponentCategory,
  ComponentType,
  type CircuitNodeData,
  type ComponentDefinition,
} from './component-types';

/** Minor grid spacing — node sizes and positions are kept on this grid. */
export const GRID_UNIT = 8;

/** Reserved label-row heights (multiples of GRID_UNIT so node sizes stay on-grid). */
export const REF_ROW_HEIGHT = 24;
export const VALUE_ROW_HEIGHT = 16;

const snapToGrid = (value: number): number => Math.round(value / GRID_UNIT) * GRID_UNIT;

/**
 * Symbol-box height snaps to twice the grid so that a centre port (cy 0.5) lands
 * on a grid line (top + H/2 stays grid-aligned), the same way edge ports (cy
 * 0/1) do. The node places the symbol box at a grid-aligned offset, so every
 * port then falls on the grid for clean orthogonal wiring.
 */
const snapHeightToGrid = (value: number): number =>
  Math.round(value / (GRID_UNIT * 2)) * (GRID_UNIT * 2);

/**
 * Static registry of every component the editor can place. Drives the library
 * palette, the on-canvas node rendering, and the properties sidebar.
 */
export const COMPONENT_CATALOG: Record<ComponentType, ComponentDefinition> = {
  [ComponentType.Resistor]: {
    type: ComponentType.Resistor,
    label: 'Resistor',
    category: ComponentCategory.Passive,
    refPrefix: 'R',
    symbol: { width: 120, height: 36 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Resistance',
    defaultValue: '10kΩ',
    specFields: [
      { key: 'power', label: 'Power rating' },
      { key: 'tolerance', label: 'Tolerance' },
      { key: 'package', label: 'Package' },
    ],
    defaultSpecs: { power: '0.25W', tolerance: '±5%', package: 'Axial THT' },
  },
  [ComponentType.Capacitor]: {
    type: ComponentType.Capacitor,
    label: 'Capacitor',
    category: ComponentCategory.Passive,
    refPrefix: 'C',
    symbol: { width: 84, height: 40 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Capacitance',
    defaultValue: '100µF',
    specFields: [
      { key: 'voltage', label: 'Voltage' },
      { key: 'package', label: 'Package' },
    ],
    defaultSpecs: { voltage: '16V', package: 'Radial THT' },
  },
  [ComponentType.Inductor]: {
    type: ComponentType.Inductor,
    label: 'Inductor',
    category: ComponentCategory.Passive,
    refPrefix: 'L',
    symbol: { width: 120, height: 36 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Inductance',
    defaultValue: '10mH',
    specFields: [
      { key: 'current', label: 'Current rating' },
      { key: 'package', label: 'Package' },
    ],
    defaultSpecs: { current: '1A', package: 'Radial' },
  },
  [ComponentType.Potentiometer]: {
    type: ComponentType.Potentiometer,
    label: 'Potentiometer',
    category: ComponentCategory.Passive,
    refPrefix: 'RV',
    // Width a multiple of 16 so the centred wiper port (cx 0.5) lands on grid.
    symbol: { width: 128, height: 48 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
      { id: 'p3', side: 'top', cx: 0.5, cy: 0 },
    ],
    valueLabel: 'Resistance',
    defaultValue: '10kΩ',
    specFields: [
      { key: 'power', label: 'Power rating' },
      { key: 'taper', label: 'Taper' },
    ],
    defaultSpecs: { power: '0.25W', taper: 'Linear' },
  },
  [ComponentType.Fuse]: {
    type: ComponentType.Fuse,
    label: 'Fuse',
    category: ComponentCategory.Passive,
    refPrefix: 'F',
    symbol: { width: 96, height: 36 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Rating',
    defaultValue: '1A',
    specFields: [
      { key: 'voltage', label: 'Voltage' },
      { key: 'type', label: 'Type' },
    ],
    defaultSpecs: { voltage: '250V', type: 'Fast-blow' },
  },
  [ComponentType.Crystal]: {
    type: ComponentType.Crystal,
    label: 'Crystal',
    category: ComponentCategory.Passive,
    refPrefix: 'Y',
    symbol: { width: 88, height: 40 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Frequency',
    defaultValue: '16MHz',
    specFields: [
      { key: 'load', label: 'Load capacitance' },
      { key: 'tolerance', label: 'Tolerance' },
    ],
    defaultSpecs: { load: '18pF', tolerance: '±30ppm' },
  },
  [ComponentType.Diode]: {
    type: ComponentType.Diode,
    label: 'Diode',
    category: ComponentCategory.Semiconductors,
    refPrefix: 'D',
    symbol: { width: 96, height: 36 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Part number',
    defaultValue: '1N4148',
    specFields: [
      { key: 'forwardVoltage', label: 'Forward voltage' },
      { key: 'package', label: 'Package' },
    ],
    defaultSpecs: { forwardVoltage: '0.7V', package: 'DO-35' },
  },
  [ComponentType.Led]: {
    type: ComponentType.Led,
    label: 'LED',
    category: ComponentCategory.Semiconductors,
    refPrefix: 'LED',
    symbol: { width: 96, height: 48 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Color',
    defaultValue: 'Red',
    specFields: [
      { key: 'forwardVoltage', label: 'Forward voltage' },
      { key: 'current', label: 'Forward current' },
      { key: 'package', label: 'Package' },
    ],
    defaultSpecs: { forwardVoltage: '2.0V', current: '20mA', package: '5mm THT' },
  },
  [ComponentType.ZenerDiode]: {
    type: ComponentType.ZenerDiode,
    label: 'Zener diode',
    category: ComponentCategory.Semiconductors,
    refPrefix: 'D',
    symbol: { width: 96, height: 36 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Voltage',
    defaultValue: '5.1V',
    specFields: [
      { key: 'power', label: 'Power rating' },
      { key: 'tolerance', label: 'Tolerance' },
    ],
    defaultSpecs: { power: '0.5W', tolerance: '±5%' },
  },
  [ComponentType.TransistorNpn]: {
    type: ComponentType.TransistorNpn,
    label: 'NPN transistor',
    category: ComponentCategory.Semiconductors,
    refPrefix: 'Q',
    symbol: { width: 96, height: 96 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'top', cx: 64 / 96, cy: 0 },
      { id: 'p3', side: 'bottom', cx: 64 / 96, cy: 1 },
    ],
    valueLabel: 'Part number',
    defaultValue: '2N3904',
    specFields: [
      { key: 'package', label: 'Package' },
      { key: 'hfe', label: 'hFE' },
    ],
    defaultSpecs: { package: 'TO-92', hfe: '100' },
  },
  [ComponentType.TransistorPnp]: {
    type: ComponentType.TransistorPnp,
    label: 'PNP transistor',
    category: ComponentCategory.Semiconductors,
    refPrefix: 'Q',
    symbol: { width: 96, height: 96 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'top', cx: 64 / 96, cy: 0 },
      { id: 'p3', side: 'bottom', cx: 64 / 96, cy: 1 },
    ],
    valueLabel: 'Part number',
    defaultValue: '2N3906',
    specFields: [
      { key: 'package', label: 'Package' },
      { key: 'hfe', label: 'hFE' },
    ],
    defaultSpecs: { package: 'TO-92', hfe: '100' },
  },
  [ComponentType.Ne555]: {
    type: ComponentType.Ne555,
    label: 'NE555',
    category: ComponentCategory.IntegratedCircuits,
    refPrefix: 'U',
    symbol: { width: 132, height: 184 },
    // 7 pins per side. Left = pins 1..7 (top→bottom), right = pins 14..8 (top→bottom).
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 1 / 8, pin: '1' },
      { id: 'p2', side: 'left', cx: 0, cy: 2 / 8, pin: '2' },
      { id: 'p3', side: 'left', cx: 0, cy: 3 / 8, pin: '3' },
      { id: 'p4', side: 'left', cx: 0, cy: 4 / 8, pin: '4' },
      { id: 'p5', side: 'left', cx: 0, cy: 5 / 8, pin: '5' },
      { id: 'p6', side: 'left', cx: 0, cy: 6 / 8, pin: '6' },
      { id: 'p7', side: 'left', cx: 0, cy: 7 / 8, pin: '7' },
      { id: 'p14', side: 'right', cx: 1, cy: 1 / 8, pin: '14' },
      { id: 'p13', side: 'right', cx: 1, cy: 2 / 8, pin: '13' },
      { id: 'p12', side: 'right', cx: 1, cy: 3 / 8, pin: '12' },
      { id: 'p11', side: 'right', cx: 1, cy: 4 / 8, pin: '11' },
      { id: 'p10', side: 'right', cx: 1, cy: 5 / 8, pin: '10' },
      { id: 'p9', side: 'right', cx: 1, cy: 6 / 8, pin: '9' },
      { id: 'p8', side: 'right', cx: 1, cy: 7 / 8, pin: '8' },
    ],
    valueLabel: 'Part number',
    defaultValue: 'NE555',
    valueAbove: true,
    specFields: [
      { key: 'package', label: 'Package' },
      { key: 'supply', label: 'Supply voltage' },
    ],
    defaultSpecs: { package: 'DIP-14', supply: '4.5–15V' },
  },
  [ComponentType.Switch]: {
    type: ComponentType.Switch,
    label: 'Switch',
    category: ComponentCategory.Electromechanical,
    refPrefix: 'SW',
    symbol: { width: 96, height: 36 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Type',
    defaultValue: 'SPST',
    specFields: [
      { key: 'rating', label: 'Contact rating' },
      { key: 'actuator', label: 'Actuator' },
    ],
    defaultSpecs: { rating: '1A 250V', actuator: 'Toggle' },
  },
  [ComponentType.PushButton]: {
    type: ComponentType.PushButton,
    label: 'Push button',
    category: ComponentCategory.Electromechanical,
    refPrefix: 'PB',
    symbol: { width: 96, height: 48 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 32 / 48 },
      { id: 'p2', side: 'right', cx: 1, cy: 32 / 48 },
    ],
    valueLabel: 'Type',
    defaultValue: 'NO',
    specFields: [
      { key: 'rating', label: 'Contact rating' },
      { key: 'package', label: 'Package' },
    ],
    defaultSpecs: { rating: '50mA 12V', package: 'THT' },
  },
  [ComponentType.Battery]: {
    type: ComponentType.Battery,
    label: 'Battery',
    category: ComponentCategory.PowerGround,
    refPrefix: 'BAT',
    symbol: { width: 96, height: 36 },
    ports: [
      { id: 'p1', side: 'left', cx: 0, cy: 0.5 },
      { id: 'p2', side: 'right', cx: 1, cy: 0.5 },
    ],
    valueLabel: 'Voltage',
    defaultValue: '9V',
    specFields: [
      { key: 'chemistry', label: 'Chemistry' },
      { key: 'capacity', label: 'Capacity' },
    ],
    defaultSpecs: { chemistry: 'Alkaline', capacity: '550mAh' },
  },
  [ComponentType.VoltageSource]: {
    type: ComponentType.VoltageSource,
    label: '+5V',
    category: ComponentCategory.PowerGround,
    refPrefix: '+5V',
    symbol: { width: 48, height: 64 },
    ports: [{ id: 'p1', side: 'bottom', cx: 0.5, cy: 1 }],
    valueLabel: null,
    defaultValue: '',
    specFields: [{ key: 'net', label: 'Net' }],
    defaultSpecs: { net: 'VCC' },
  },
  [ComponentType.Ground]: {
    type: ComponentType.Ground,
    label: 'GND',
    category: ComponentCategory.PowerGround,
    refPrefix: 'GND',
    symbol: { width: 48, height: 56 },
    ports: [{ id: 'p1', side: 'top', cx: 0.5, cy: 0 }],
    valueLabel: null,
    defaultValue: '',
    specFields: [{ key: 'net', label: 'Net' }],
    defaultSpecs: { net: 'GND' },
  },
};

/** Categories in the order they appear in the library sidebar. */
export const CATEGORY_ORDER: ComponentCategory[] = [
  ComponentCategory.Passive,
  ComponentCategory.Semiconductors,
  ComponentCategory.IntegratedCircuits,
  ComponentCategory.Electromechanical,
  ComponentCategory.PowerGround,
];

/** Component types with a fixed reference designator (no R1/R2 increment). */
const FIXED_REFERENCE = new Set<ComponentType>([ComponentType.VoltageSource, ComponentType.Ground]);

export function isAutoNumbered(type: ComponentType): boolean {
  return !FIXED_REFERENCE.has(type);
}

/** Symbol box size, rounded to the grid so node dimensions stay on it. */
export function getSymbolSize(def: ComponentDefinition): Size {
  return { width: snapToGrid(def.symbol.width), height: snapHeightToGrid(def.symbol.height) };
}

/** Overall node size (grid-rounded symbol box plus the reserved label rows). */
export function getNodeSize(def: ComponentDefinition): Size {
  const symbol = getSymbolSize(def);
  let height = REF_ROW_HEIGHT + symbol.height;
  if (def.valueLabel !== null) {
    height += VALUE_ROW_HEIGHT;
  }
  return { width: symbol.width, height };
}

/** Initial node data for a freshly created component (reference fixed up on drop). */
export function createNodeData(type: ComponentType): CircuitNodeData {
  const def = COMPONENT_CATALOG[type];
  return {
    label: def.label,
    componentType: type,
    reference: isAutoNumbered(type) ? `${def.refPrefix}1` : def.refPrefix,
    value: def.defaultValue,
    description: '',
    specs: { ...def.defaultSpecs },
  };
}

/** Builds the ng-diagram palette item used as the drag source for a tile. */
export function toPaletteItem(type: ComponentType): NgDiagramPaletteItem<CircuitNodeData> {
  const def = COMPONENT_CATALOG[type];
  return {
    type: CIRCUIT_NODE_TYPE,
    data: createNodeData(type),
    size: getNodeSize(def),
    autoSize: false,
  };
}
