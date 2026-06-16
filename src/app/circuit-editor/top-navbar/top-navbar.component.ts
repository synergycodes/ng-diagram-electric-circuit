import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ExportMenuComponent } from '../export/export-menu.component';
import { ProjectNameService } from './project-name.service';
import { ThemeToggleComponent } from './theme-toggle.component';

@Component({
  selector: 'app-top-navbar',
  imports: [ThemeToggleComponent, ExportMenuComponent],
  templateUrl: './top-navbar.component.html',
  styleUrl: './top-navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopNavbarComponent {
  protected readonly projectName = inject(ProjectNameService);

  // Click the project name to rename it.
  protected readonly editing = signal(false);
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    // Focus + select the field as soon as edit mode reveals it.
    effect(() => {
      if (!this.editing()) return;
      const el = this.nameInput()?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }

  protected startEdit(): void {
    this.editing.set(true);
  }

  // Enter/blur commit; the guard absorbs the blur that fires on teardown.
  protected commit(value: string): void {
    if (!this.editing()) return;
    this.projectName.rename(value);
    this.editing.set(false);
  }

  // Escape restores the field then blurs, so the trailing commit is a no-op.
  protected cancelEdit(input: HTMLInputElement): void {
    input.value = this.projectName.name();
    input.blur();
  }
}
