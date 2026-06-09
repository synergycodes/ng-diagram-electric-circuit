import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { COMPONENT_CATALOG } from '../diagram/model/component-catalog';
import { type CircuitNodeData } from '../diagram/model/component-types';
import { ComponentSymbolComponent } from '../diagram/node/symbols/component-symbol.component';
import { FormFieldComponent } from './components/form-field/form-field.component';
import { SidebarPlaceholderComponent } from './components/sidebar-placeholder/sidebar-placeholder.component';
import { PropertiesSidebarService } from './properties-sidebar.service';

interface SpecRow {
  key: string;
  label: string;
  value: string;
}

/** Special spec-row key meaning "the node's headline value". */
const VALUE_KEY = '__value';

/**
 * Right "Properties" rail. Shows the selected component's identity plus its
 * General Information and per-type Specification fields, and writes edits back
 * through the sidebar service.
 */
@Component({
  selector: 'app-properties-sidebar',
  imports: [ComponentSymbolComponent, FormFieldComponent, SidebarPlaceholderComponent],
  templateUrl: './properties-sidebar.component.html',
  styleUrl: './properties-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.expanded]': 'isExpanded()' },
})
export class PropertiesSidebarComponent {
  private readonly service = inject(PropertiesSidebarService);

  protected readonly isExpanded = this.service.isExpanded;
  protected readonly state = this.service.sidebarState;
  protected readonly node = this.service.selectedNode;

  protected readonly def = computed(() => {
    const node = this.node();
    return node ? COMPONENT_CATALOG[node.data.componentType] : undefined;
  });

  protected readonly typeLabel = computed(() => this.def()?.label ?? '');

  protected readonly specRows = computed<SpecRow[]>(() => {
    const node = this.node();
    const def = this.def();
    if (!node || !def) return [];

    const rows: SpecRow[] = [];
    if (def.valueLabel) {
      rows.push({ key: VALUE_KEY, label: def.valueLabel, value: node.data.value });
    }
    for (const field of def.specFields) {
      rows.push({ key: field.key, label: field.label, value: node.data.specs[field.key] ?? '' });
    }
    return rows;
  });

  protected onToggle(): void {
    this.service.toggleSidebarVisibility();
  }

  protected onName(event: Event): void {
    this.patch({ reference: value(event) });
  }

  protected onDescription(event: Event): void {
    this.patch({ description: value(event) });
  }

  protected onSpec(key: string, event: Event): void {
    if (key === VALUE_KEY) {
      this.patch({ value: value(event) });
    } else {
      this.patch({ specs: { [key]: value(event) } });
    }
  }

  protected onRemove(): void {
    const id = this.node()?.id;
    if (id) this.service.removeNode(id);
  }

  private patch(partial: Partial<CircuitNodeData>): void {
    const id = this.node()?.id;
    if (id) this.service.patchData(id, partial);
  }
}

function value(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
}
