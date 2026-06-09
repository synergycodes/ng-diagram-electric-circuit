import { Injectable, signal } from '@angular/core';

export interface ContextMenuState {
  kind: 'node' | 'background';
  /** Client coordinates where the menu opened (also used as paste position). */
  x: number;
  y: number;
  nodeId?: string;
}

/** Tracks the open/closed state and target of the canvas context menu. */
@Injectable()
export class ContextMenuService {
  readonly state = signal<ContextMenuState | null>(null);

  openForNode(x: number, y: number, nodeId: string): void {
    this.state.set({ kind: 'node', x, y, nodeId });
  }

  openForBackground(x: number, y: number): void {
    this.state.set({ kind: 'background', x, y });
  }

  close(): void {
    this.state.set(null);
  }
}
