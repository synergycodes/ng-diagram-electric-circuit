import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { COMPONENT_CATALOG } from '../../model/component-catalog';
import { ComponentType } from '../../model/component-types';
import { symbolBody } from './symbol-shapes';

/**
 * Renders the schematic symbol for a component as inline SVG. The viewBox
 * matches the catalog symbol size (flow units) so terminal coordinates line up
 * with the ports positioned by the node template. All strokes use
 * `currentColor`, letting the node set white / orange per selection state. The
 * shape markup itself comes from `symbol-shapes.ts` (shared with the SVG export).
 */
@Component({
  selector: 'app-component-symbol',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <svg
      class="symbol"
      [attr.viewBox]="viewBox()"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.preserveAspectRatio]="stretch() ? 'none' : 'xMidYMid meet'"
      [innerHTML]="body()"
    ></svg>
  `,
  styles: `
    :host {
      width: 100%;
      height: 100%;
    }
    .symbol {
      display: block;
    }
  `,
})
export class ComponentSymbolComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly type = input.required<ComponentType>();

  /**
   * When true the drawing stretches to fill its box (used on the canvas, where
   * the box is the grid-rounded symbol size). Tiles/headers keep the aspect
   * ratio (false) so symbols never look squashed.
   */
  readonly stretch = input(false);

  protected readonly strokeWidth = 'var(--ce-symbol-stroke-width)';

  protected readonly viewBox = computed(() => {
    const { width, height } = COMPONENT_CATALOG[this.type()].symbol;
    return `0 0 ${width} ${height}`;
  });

  // Trusted: the markup is our own static shape library, not user input.
  protected readonly body = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(symbolBody(this.type())),
  );
}
