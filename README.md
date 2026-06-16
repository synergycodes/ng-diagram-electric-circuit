# ng-diagram Circuit Editor Template

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/licenses/MIT)

**Live demo:** https://synergycodes.github.io/ng-diagram-electric-circuit/

Interactive circuit / schematic editor built with Angular 21 and [ng-diagram](https://www.npmjs.com/package/ng-diagram). Use this project as a starting point for building your own schematic capture tool, node-based editor, or component-library-driven diagram. Lean dependencies: Angular, ng-diagram, and [html-to-image](https://www.npmjs.com/package/html-to-image) (for JPEG export) — no opinionated third-party UI libraries.

Features:

- Drag-and-drop component placement from a searchable, categorized library palette
- A data-driven component catalog (resistor, capacitor, inductor, potentiometer, fuse, crystal, diode, LED, Zener, NPN/PNP transistors, NE555, switch, push button, battery, +5V, ground) rendered as crisp inline SVG
- Free-form canvas: move, select, rotate, and wire components port-to-port
- **Orthogonal wire editing** — reshape wires by dragging their segments, with grid snapping and port-anchored ends
- **Wire junctions (link-to-link)** — drop or drag a wire onto another to create a solder-dot junction; branch from a wire, with junction port routing, merge-on-delete, and cleanup of orphaned junctions
- Right-click **context menus** — copy / cut / paste / delete / rotate ±90° on a node, paste on the background
- **Export** dropdown: editable SVG, JPEG snapshot of the canvas, or JSON (components + connections)
- Properties sidebar with per-component-type specification fields (diagram-to-UI integration)
- Minimap and zoom controls; full-height library / properties rails
- Dark / light theme matching a dedicated design token system
- Unique reference designators (R1, R2, C1…) auto-assigned on drop

## Component library

| Category            | Components                                                  |
| ------------------- | ----------------------------------------------------------- |
| Passive             | Resistor, Capacitor, Inductor, Potentiometer, Fuse, Crystal |
| Semiconductors      | Diode, LED, Zener diode, NPN transistor, PNP transistor     |
| Integrated circuits | NE555                                                       |
| Electromechanical   | Switch, Push button                                         |
| Power & Ground      | Battery, +5V source, GND                                    |

The library is fully **data-driven**: every component is one entry in
[`component-catalog.ts`](src/app/circuit-editor/diagram/model/component-catalog.ts)
describing its symbol size, connection ports, reference prefix, default value,
and editable specification fields. Add a new component by adding a catalog entry
and a `@case` to the [symbol component](src/app/circuit-editor/diagram/node/symbols/component-symbol.component.ts).

## Getting Started

**Prerequisites:** Node.js v20.19+ or v22.12+, npm 10+

```bash
npm install
npm start
```

Open http://localhost:4200.

## Scripts

| Script                 | Description                       |
| ---------------------- | --------------------------------- |
| `npm start`            | Start the dev server (`ng serve`) |
| `npm run build`        | Production build (`ng build`)     |
| `npm run watch`        | Development build in watch mode   |
| `npm test`             | Run unit tests (Vitest)           |
| `npm run lint`         | Lint with ESLint (`ng lint`)      |
| `npm run format`       | Format sources with Prettier      |
| `npm run format:check` | Check formatting without writing  |

## ng-diagram APIs demonstrated

| Concern             | API                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------- |
| Bootstrap           | `provideNgDiagram()`                                                                    |
| Diagram surface     | `<ng-diagram>`, `<ng-diagram-background>`                                               |
| Node template       | `NgDiagramNodeTemplate`, `NgDiagramNodeTemplateMap`                                     |
| Edge template       | `NgDiagramEdgeTemplate`, `NgDiagramEdgeTemplateMap`, `NgDiagramBaseEdgeComponent`       |
| Ports               | `<ng-diagram-port>`                                                                     |
| Palette (drag/drop) | `<ng-diagram-palette-item>`, `<ng-diagram-palette-item-preview>`, `paletteItemDropped`  |
| Minimap             | `<ng-diagram-minimap>`                                                                  |
| Model               | `initializeModel()`, `NgDiagramModelService`                                            |
| Selection           | `NgDiagramSelectionService`                                                             |
| Viewport            | `NgDiagramViewportService` (`zoomToFit`, `zoom`, `scale`)                               |
| Linking config      | `NgDiagramConfig.linking` (`validateConnection`, `finalEdgeDataBuilder`)                |
| Edge routing        | `NgDiagramConfig.edgeRouting` (orthogonal) + `routingMode: 'manual'` for reshaped wires |
| Middleware          | `createMiddlewares()` — custom junction port-routing middleware                         |
| Events              | `diagramInit`, `edgeDrawEnded`, `selectionMoved`, `selectionRemoved`                    |

## Architecture

```
src/
├── circuit-theme.css                 # --ce-* color tokens (dark/light) + ng-diagram var remap
├── typography.css                    # Poppins type scale
└── app/circuit-editor/
    ├── circuit-editor.config.ts       # injectable editor config (viewport)
    ├── pages/                         # page shell: canvas + overlays
    ├── diagram/
    │   ├── diagram.component.*        # ng-diagram host, template maps, palette-drop
    │   ├── data.ts                    # seed example circuit
    │   ├── editor-actions.service.ts  # clipboard / delete / rotate (context-menu actions)
    │   ├── model/                     # ComponentType, CircuitNodeData, catalog, guards, connectivity
    │   ├── node/
    │   │   ├── circuit-node.component.* # one template for every component
    │   │   └── symbols/               # inline-SVG schematic symbols
    │   └── wire/                      # everything about wires/links
    │       ├── wire.component.*        # edge (wire) template
    │       ├── geometry/              # pure orthogonal-polyline math + hit testing
    │       ├── pointer-drag-controller.ts # shared gesture plumbing
    │       ├── junction/              # solder-dot node + topology/ + routing/
    │       └── interactions/          # reshape, stretch, branch-from-wire, link-drop-preview
    ├── library-sidebar/               # searchable component palette
    ├── properties-sidebar/            # selection-driven properties form
    ├── minimap-bar/                   # bottom-right zoom + collapsible minimap
    ├── context-menu/                  # node & background right-click menus
    ├── export/                        # SVG + JPEG + JSON export (service + dropdown)
    └── top-navbar/                    # logo, filename, export, theme toggle
```

### Design tokens

Every color is a `--ce-*` token defined per theme in
[`circuit-theme.css`](src/circuit-theme.css), taken straight from the Figma
color sheets (names and values for both dark and light modes). The base
`--ngd-*` tokens ship with ng-diagram itself, so that file only adds the `--ce-*`
tokens and remaps the few `--ngd-*` variables that drive the on-canvas look —
grid background (major line every 10 minor cells), violet port rings, and the
white-50% wire stroke.

## Customization

- **Add a component:** add an entry to `COMPONENT_CATALOG` and a `@case` in
  `ComponentSymbolComponent`. The palette tile, on-canvas node, and properties
  form pick it up automatically.
- **Change the seed circuit:** edit [`data.ts`](src/app/circuit-editor/diagram/data.ts).
- **Tune the viewport:** edit `CIRCUIT_EDITOR_DEFAULTS` (zoom-to-fit padding,
  zoom step) in [`circuit-editor.config.ts`](src/app/circuit-editor/circuit-editor.config.ts),
  or override the `CIRCUIT_EDITOR_CONFIG` token in the page providers.
- **Theme:** adjust the `--ce-*` tokens in `circuit-theme.css`.

## Export format

[`export.service.ts`](src/app/circuit-editor/export/export.service.ts) offers
three formats: an **editable SVG** (vector schematic built from the model,
black-on-white for print), a **JPEG** raster snapshot of the canvas, and
**JSON**. The JSON is a documented `ng-diagram-circuit` document — a `components`
array (type, reference, value, specs, position, rotation) plus a `connections`
array (port-to-port). The connectivity standard for circuits is a **SPICE
netlist**, but these generic illustrative components don't map cleanly to SPICE
device cards, so a clean JSON format is used instead.

## Known limitations / notes

- **NE555 footprint:** the symbol follows the design's stylized **14-pin DIP**
  drawing rather than the real 8-pin DIP-8 package.
- **Composite components:** the catalog ships single-primitive components only.
  Composite parts (e.g. a bridge rectifier — an assembly of diodes plus internal
  wiring) are out of scope, since each catalog entry maps to one schematic symbol.

## Tech stack

- [Angular 21](https://angular.dev) (standalone, signals, zoneless-ready)
- [ng-diagram](https://www.ngdiagram.dev)
- [html-to-image](https://www.npmjs.com/package/html-to-image) (JPEG export)
- Plain CSS with a custom design-token system (no UI framework)
- Poppins (Google Fonts)

## Contributing

Contributions are welcome. Install dependencies with `npm install`, then use
`npm start` to run the dev server and `npm run lint`, `npm run format:check`,
and `npm test` before opening a pull request. Please also read the
[Code of Conduct](CODE_OF_CONDUCT.md). To report a vulnerability, see the
[Security Policy](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
