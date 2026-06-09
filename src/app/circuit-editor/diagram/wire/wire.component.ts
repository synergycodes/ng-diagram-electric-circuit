import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgDiagramBaseEdgeComponent, type Edge, type NgDiagramEdgeTemplate } from 'ng-diagram';
import { type CircuitEdgeData } from '../model/component-types';

/**
 * Wire (edge) template. Connections between component ports are rendered with
 * the built-in base edge; styling (white-50% stroke) comes from the remapped
 * `--ngd-edge-*` tokens. Link-to-link junctions are intentionally out of scope
 * and will be added by a later feature.
 */
@Component({
  selector: 'app-wire',
  imports: [NgDiagramBaseEdgeComponent],
  template: `<ng-diagram-base-edge [edge]="edge()" />`,
  styleUrl: './wire.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WireComponent implements NgDiagramEdgeTemplate<CircuitEdgeData> {
  readonly edge = input.required<Edge<CircuitEdgeData>>();
}
