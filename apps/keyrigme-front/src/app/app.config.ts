import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideSocketIo, SocketIoConfig } from 'ngx-socket-io';
import { provideHttpClient, withFetch } from '@angular/common/http';

const config: SocketIoConfig = { url: 'http://localhost:3000', options: {} };

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    provideSocketIo(config),
    provideRouter(appRoutes),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
  ],
};
