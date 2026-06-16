import {
  ApplicationConfig,
  ErrorHandler,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { AppErrorHandler } from './app-error-handler';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
  ],
};
