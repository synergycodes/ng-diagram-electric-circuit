import { Injectable, computed, signal } from '@angular/core';

const DEFAULT_NAME = 'Untitled circuit';

/**
 * Holds the editable project name shown in the navbar. Shared by the navbar
 * (rename) and the export service (filename). Root-scoped because those live in
 * different DI scopes.
 */
@Injectable({ providedIn: 'root' })
export class ProjectNameService {
  readonly name = signal(DEFAULT_NAME);

  /** Filesystem-safe base name for exported files (no extension). */
  readonly fileName = computed(() => toSafeFileName(this.name()));

  /** Commit an edited name; blank input falls back to the default. */
  rename(value: string): void {
    const trimmed = value.trim();
    this.name.set(trimmed.length > 0 ? trimmed : DEFAULT_NAME);
  }
}

// Keep filename-safe chars (alphanumeric, space, _ . ( ) -); collapse whitespace.
function toSafeFileName(name: string): string {
  const safe = name
    .replace(/[^a-zA-Z0-9 _.()-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return safe.length > 0 ? safe : 'circuit';
}
