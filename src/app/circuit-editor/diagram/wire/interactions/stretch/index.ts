// Edge-stretch feature: keeps manual-routed wires attached to their ports when a
// connected node moves, preserving interior bends. Entry point:
// applyEdgeStretchOnSelectionMoved. Depends only on wire/geometry — never on a sibling
// interaction or on wire/junction.

export { applyEdgeStretchOnSelectionMoved } from './stretch';
export * from './config';
