import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EditorActionsService } from '../diagram/editor-actions.service';
import { ContextMenuService } from './context-menu.service';

interface MenuItem {
  id: 'copy' | 'cut' | 'paste' | 'delete' | 'rotate-left' | 'rotate-right';
  label: string;
  icon: string;
  disabled?: boolean;
  separatorBefore?: boolean;
}

/** Right-click menu for nodes (full actions) and the canvas background (paste). */
@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent {
  private readonly menu = inject(ContextMenuService);
  private readonly actions = inject(EditorActionsService);

  protected readonly state = this.menu.state;

  /** Menu position clamped so it never overflows the viewport edges. */
  protected readonly position = computed(() => {
    const state = this.state();
    if (!state) return { x: 0, y: 0 };
    const width = 200;
    const height = this.items().length * 40 + 24;
    return {
      x: Math.max(8, Math.min(state.x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(state.y, window.innerHeight - height - 8)),
    };
  });

  protected readonly items = computed<MenuItem[]>(() => {
    const state = this.state();
    if (!state) return [];
    const canPaste = this.actions.hasEverCopied();

    if (state.kind === 'background') {
      return [{ id: 'paste', label: 'Paste', icon: 'paste', disabled: !canPaste }];
    }

    return [
      { id: 'copy', label: 'Copy', icon: 'copy' },
      { id: 'cut', label: 'Cut', icon: 'cut' },
      { id: 'paste', label: 'Paste', icon: 'paste', disabled: !canPaste },
      { id: 'delete', label: 'Delete', icon: 'trash', separatorBefore: true },
      { id: 'rotate-left', label: 'Rotate left', icon: 'rotate-left', separatorBefore: true },
      { id: 'rotate-right', label: 'Rotate right', icon: 'rotate-right' },
    ];
  });

  protected close(): void {
    this.menu.close();
  }

  protected run(item: MenuItem): void {
    if (item.disabled) return;
    const state = this.state();
    if (!state) return;

    switch (item.id) {
      case 'copy':
        this.actions.copy();
        break;
      case 'cut':
        this.actions.cut();
        break;
      case 'paste':
        this.actions.pasteAt({ x: state.x, y: state.y });
        break;
      case 'delete':
        this.actions.deleteSelection();
        break;
      case 'rotate-left':
        this.actions.rotateBy(-90);
        break;
      case 'rotate-right':
        this.actions.rotateBy(90);
        break;
    }
    this.close();
  }
}
