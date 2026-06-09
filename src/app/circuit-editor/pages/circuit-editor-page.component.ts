import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { provideNgDiagram } from 'ng-diagram';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { ContextMenuService } from '../context-menu/context-menu.service';
import { DiagramComponent } from '../diagram/diagram.component';
import { ConnectivityService } from '../diagram/model/connectivity.service';
import { EditorActionsService } from '../diagram/editor-actions.service';
import { ExportService } from '../export/export.service';
import { LibrarySidebarComponent } from '../library-sidebar/library-sidebar.component';
import { MinimapBarComponent } from '../minimap-bar/minimap-bar.component';
import { PropertiesSidebarComponent } from '../properties-sidebar/properties-sidebar.component';
import { PropertiesSidebarService } from '../properties-sidebar/properties-sidebar.service';
import { TopNavbarComponent } from '../top-navbar/top-navbar.component';

/**
 * Top-level circuit editor screen: a full-bleed diagram canvas with the navbar,
 * component library, properties panel, bottom toolbar, minimap and context menu
 * overlaid on top.
 */
@Component({
  selector: 'app-circuit-editor-page',
  imports: [
    DiagramComponent,
    LibrarySidebarComponent,
    PropertiesSidebarComponent,
    TopNavbarComponent,
    MinimapBarComponent,
    ContextMenuComponent,
  ],
  templateUrl: './circuit-editor-page.component.html',
  styleUrl: './circuit-editor-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.props-expanded]': 'propsExpanded()' },
  providers: [
    provideNgDiagram(),
    PropertiesSidebarService,
    EditorActionsService,
    ExportService,
    ContextMenuService,
    ConnectivityService,
  ],
})
export class CircuitEditorPageComponent {
  protected readonly propsExpanded = inject(PropertiesSidebarService).isExpanded;
}
