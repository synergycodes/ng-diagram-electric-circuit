import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgDiagramPortComponent, type NgDiagramNodeTemplate, type Node } from 'ng-diagram';
import { JUNCTION_PORT_IDS, type JunctionNodeData } from './model';

/**
 * Wire junction — the schematic "solder dot" rendered where one wire is dropped
 * onto another. An 8-px node with four cardinal ports; the wire halves and the
 * branch each anchor to the side facing their far end. The visible dot is the
 * connection marker and also the node's hit area for select/drag.
 */
@Component({
  selector: 'app-junction-node',
  imports: [NgDiagramPortComponent],
  template: `
    <div class="dot"></div>

    <ng-diagram-port class="port top" [id]="portIds.top" type="both" side="top" />
    <ng-diagram-port class="port right" [id]="portIds.right" type="both" side="right" />
    <ng-diagram-port class="port bottom" [id]="portIds.bottom" type="both" side="bottom" />
    <ng-diagram-port class="port left" [id]="portIds.left" type="both" side="left" />
  `,
  styleUrl: './node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.selected]': 'node().selected',
  },
})
export class JunctionNodeComponent implements NgDiagramNodeTemplate<JunctionNodeData> {
  readonly node = input.required<Node<JunctionNodeData>>();

  protected readonly portIds = JUNCTION_PORT_IDS;
}
