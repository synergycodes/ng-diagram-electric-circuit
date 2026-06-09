import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CATEGORY_ORDER, COMPONENT_CATALOG } from '../diagram/model/component-catalog';
import { ComponentCategory, type ComponentType } from '../diagram/model/component-types';
import { PaletteTileComponent } from './components/palette-tile/palette-tile.component';

interface LibrarySection {
  category: ComponentCategory;
  types: ComponentType[];
}

/**
 * Left "Components" rail: a searchable, categorized palette of draggable
 * component tiles. Categories collapse independently and the whole panel can be
 * collapsed to a thin rail.
 */
@Component({
  selector: 'app-library-sidebar',
  imports: [PaletteTileComponent],
  templateUrl: './library-sidebar.component.html',
  styleUrl: './library-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibrarySidebarComponent {
  protected readonly isExpanded = signal(true);
  protected readonly search = signal('');
  protected readonly collapsedCategories = signal<ReadonlySet<ComponentCategory>>(new Set());

  private readonly allSections: LibrarySection[] = CATEGORY_ORDER.map((category) => ({
    category,
    types: Object.values(COMPONENT_CATALOG)
      .filter((def) => def.category === category)
      .map((def) => def.type),
  }));

  protected readonly sections = computed<LibrarySection[]>(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.allSections;
    return this.allSections
      .map((section) => ({
        category: section.category,
        types: section.types.filter((type) =>
          COMPONENT_CATALOG[type].label.toLowerCase().includes(term),
        ),
      }))
      .filter((section) => section.types.length > 0);
  });

  protected isCategoryCollapsed(category: ComponentCategory): boolean {
    return this.collapsedCategories().has(category);
  }

  protected toggleCategory(category: ComponentCategory): void {
    this.collapsedCategories.update((set) => {
      const next = new Set(set);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected togglePanel(): void {
    this.isExpanded.update((v) => !v);
  }
}
