import { RenderMode, ServerRoute } from '@angular/ssr';
import { PAGES } from './shared/constants/pages.const';

export const serverRoutes: ServerRoute[] = [
  // These pages depend on the tab's session, only known in the browser: prerendering them would bake in
  // the guard's redirect to the home page and break a page reload.
  ...Object.values(PAGES).map((path): ServerRoute => ({ path, renderMode: RenderMode.Client })),
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
