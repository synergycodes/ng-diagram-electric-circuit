import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ExportService } from './export.service';

/** Navbar "Export" button that opens a dropdown offering SVG / JPEG / DXF / JSON export. */
@Component({
  selector: 'app-export-menu',
  templateUrl: './export-menu.component.html',
  styleUrl: './export-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportMenuComponent {
  private readonly exportService = inject(ExportService);

  protected readonly isOpen = signal(false);

  protected toggle(): void {
    this.isOpen.update((v) => !v);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected exportSvg(): void {
    this.close();
    this.exportService.exportSvg();
  }

  protected exportJpeg(): void {
    this.close();
    void this.exportService.exportJpeg();
  }

  protected exportDxf(): void {
    this.close();
    this.exportService.exportDxf();
  }

  protected exportJson(): void {
    this.close();
    this.exportService.exportJson();
  }
}
