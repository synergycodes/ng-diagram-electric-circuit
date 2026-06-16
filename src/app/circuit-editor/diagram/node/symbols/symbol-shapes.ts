import { COMPONENT_CATALOG } from '../../model/component-catalog';
import { ComponentType } from '../../model/component-types';

/**
 * Inner SVG markup for each schematic symbol, drawn in its catalog viewBox
 * coordinates. Shapes use `currentColor` so the colour comes from the host: the
 * on-canvas node sets it per selection state, the vector SVG export sets a fixed
 * ink. Single source of truth shared by `ComponentSymbolComponent` (live render)
 * and `ExportService` (file export) — keep both pointed here so they never drift.
 */
export function symbolBody(type: ComponentType): string {
  switch (type) {
    case ComponentType.Resistor:
      return `<polyline points="0,18 36,18 40,9 48,27 56,9 64,27 72,9 80,27 84,18 120,18" />`;
    case ComponentType.Capacitor:
      return (
        `<line x1="0" y1="20" x2="38" y2="20" />` +
        `<line x1="38" y1="8" x2="38" y2="32" />` +
        `<line x1="46" y1="8" x2="46" y2="32" />` +
        `<line x1="46" y1="20" x2="84" y2="20" />`
      );
    case ComponentType.Inductor:
      return (
        `<line x1="0" y1="18" x2="30" y2="18" />` +
        `<path d="M30 18 a7.5 7.5 0 0 1 15 0 a7.5 7.5 0 0 1 15 0 a7.5 7.5 0 0 1 15 0 a7.5 7.5 0 0 1 15 0" />` +
        `<line x1="90" y1="18" x2="120" y2="18" />`
      );
    case ComponentType.Potentiometer:
      return (
        `<polyline points="0,24 40,24 44,15 52,33 60,15 68,33 76,15 84,33 88,24 128,24" />` +
        `<line x1="64" y1="0" x2="64" y2="14" />` +
        `<path d="M58 14 L70 14 L64 24 Z" fill="currentColor" stroke="none" />`
      );
    case ComponentType.Fuse:
      return (
        `<line x1="0" y1="18" x2="96" y2="18" />` +
        `<rect x="26" y="9" width="44" height="18" rx="3" />`
      );
    case ComponentType.Crystal:
      return (
        `<line x1="0" y1="20" x2="30" y2="20" />` +
        `<line x1="30" y1="8" x2="30" y2="32" />` +
        `<rect x="38" y="10" width="12" height="20" />` +
        `<line x1="58" y1="8" x2="58" y2="32" />` +
        `<line x1="58" y1="20" x2="88" y2="20" />`
      );
    case ComponentType.Diode:
      return (
        `<line x1="0" y1="18" x2="36" y2="18" />` +
        `<path d="M36 8 L36 28 L58 18 Z" />` +
        `<line x1="58" y1="8" x2="58" y2="28" />` +
        `<line x1="58" y1="18" x2="96" y2="18" />`
      );
    case ComponentType.ZenerDiode:
      return (
        `<line x1="0" y1="18" x2="36" y2="18" />` +
        `<path d="M36 8 L36 28 L58 18 Z" />` +
        `<path d="M52 8 L58 8 L58 28 L64 28" />` +
        `<line x1="58" y1="18" x2="96" y2="18" />`
      );
    case ComponentType.TransistorNpn:
      return bjtBody(true);
    case ComponentType.TransistorPnp:
      return bjtBody(false);
    case ComponentType.Switch:
      return (
        `<line x1="0" y1="18" x2="28" y2="18" />` +
        `<circle cx="28" cy="18" r="3" fill="currentColor" stroke="none" />` +
        `<line x1="28" y1="18" x2="62" y2="6" />` +
        `<circle cx="68" cy="18" r="3" fill="currentColor" stroke="none" />` +
        `<line x1="68" y1="18" x2="96" y2="18" />`
      );
    case ComponentType.PushButton:
      return (
        `<line x1="0" y1="32" x2="30" y2="32" />` +
        `<line x1="66" y1="32" x2="96" y2="32" />` +
        `<line x1="30" y1="32" x2="30" y2="26" />` +
        `<line x1="66" y1="32" x2="66" y2="26" />` +
        `<line x1="26" y1="26" x2="70" y2="26" />` +
        `<line x1="48" y1="26" x2="48" y2="12" />` +
        `<line x1="38" y1="12" x2="58" y2="12" />`
      );
    case ComponentType.Led:
      return (
        `<line x1="0" y1="24" x2="34" y2="24" />` +
        `<path d="M34 12 L34 36 L56 24 Z" />` +
        `<line x1="56" y1="12" x2="56" y2="36" />` +
        `<line x1="56" y1="24" x2="96" y2="24" />` +
        `<line x1="52" y1="14" x2="64" y2="2" />` +
        `<polyline points="58,2 64,2 64,8" />` +
        `<line x1="60" y1="18" x2="72" y2="6" />` +
        `<polyline points="66,6 72,6 72,12" />`
      );
    case ComponentType.Battery:
      return (
        `<line x1="0" y1="18" x2="34" y2="18" />` +
        `<line x1="34" y1="6" x2="34" y2="30" />` +
        `<line x1="42" y1="11" x2="42" y2="25" />` +
        `<line x1="50" y1="6" x2="50" y2="30" />` +
        `<line x1="58" y1="11" x2="58" y2="25" />` +
        `<line x1="58" y1="18" x2="96" y2="18" />`
      );
    case ComponentType.VoltageSource:
      return `<path d="M24 6 L13 30 L35 30 Z" />` + `<line x1="24" y1="30" x2="24" y2="64" />`;
    case ComponentType.Ground:
      return (
        `<line x1="24" y1="0" x2="24" y2="28" />` +
        `<line x1="8" y1="28" x2="40" y2="28" />` +
        `<line x1="14" y1="38" x2="34" y2="38" />` +
        `<line x1="20" y1="46" x2="28" y2="46" />`
      );
    case ComponentType.Ne555:
      return ne555Body();
  }
}

// BJT (viewBox 96×96): base lead on the left to a vertical base plate, with the
// collector lead leaving top-right and the emitter bottom-right. The emitter
// arrow points away from the base for NPN, toward it for PNP.
function bjtBody(npn: boolean): string {
  const structure =
    `<line x1="0" y1="48" x2="36" y2="48" />` + // base lead
    `<line x1="36" y1="30" x2="36" y2="66" />` + // base plate
    `<line x1="36" y1="42" x2="64" y2="20" />` + // collector diagonal
    `<line x1="64" y1="20" x2="64" y2="0" />` + // collector lead
    `<line x1="36" y1="54" x2="64" y2="76" />` + // emitter diagonal
    `<line x1="64" y1="76" x2="64" y2="96" />`; // emitter lead
  const arrow = npn
    ? `<path d="M55.6 69.4 L46 67 L51 60.7 Z" fill="currentColor" stroke="none" />`
    : `<path d="M43 59.5 L47.6 68.3 L52.6 62 Z" fill="currentColor" stroke="none" />`;
  return structure + arrow;
}

function ne555Body(): string {
  const { width, height } = COMPONENT_CATALOG[ComponentType.Ne555].symbol;
  const parts: string[] = [
    `<rect x="24" y="8" width="84" height="168" rx="10" />`,
    `<path d="M56 8 a10 10 0 0 0 20 0" />`,
  ];
  for (let k = 1; k <= 7; k++) {
    const y = (height * k) / 8;
    // Left side: pins 1..7 (top → bottom).
    parts.push(`<line x1="0" y1="${y}" x2="24" y2="${y}" />`);
    parts.push(
      `<text x="30" y="${y + 4}" text-anchor="start" fill="currentColor" stroke="none" font-size="11">${k}</text>`,
    );
    // Right side: pins 14..8 (top → bottom).
    parts.push(`<line x1="${width - 24}" y1="${y}" x2="${width}" y2="${y}" />`);
    parts.push(
      `<text x="${width - 30}" y="${y + 4}" text-anchor="end" fill="currentColor" stroke="none" font-size="11">${15 - k}</text>`,
    );
  }
  return parts.join('');
}
