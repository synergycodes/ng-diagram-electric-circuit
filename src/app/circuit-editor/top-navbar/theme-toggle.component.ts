import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
})
export class ThemeToggleComponent {
  private readonly document = inject(DOCUMENT);

  // Source of truth on init: the persisted preference first, then the
  // already-applied dataset (set by the index.html bootstrap script).
  activeTheme = signal<'light' | 'dark'>(this.readInitialTheme());

  private readInitialTheme(): 'light' | 'dark' {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return this.document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
  }

  toggleTheme(): void {
    const next = this.activeTheme() === 'dark' ? 'light' : 'dark';
    this.document.documentElement.dataset['theme'] = next;
    localStorage.setItem('theme', next);
    this.activeTheme.set(next);
  }
}
