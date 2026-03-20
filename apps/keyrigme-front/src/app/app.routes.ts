import { Route } from '@angular/router';
import { PAGES } from './shared/constants/pages.const';
import { hasRoomGuard } from './shared/guards/has-room.guard';

export const appRoutes: Route[] = [
  { path: '', loadComponent: () => import('./home/home.component') },
  // { path: '', loadComponent: () => import('./result/result.component') },
  {
    path: PAGES.Lobby,
    loadComponent: () => import('./lobby/lobby.component'),
    canActivate: [hasRoomGuard],
  },
  {
    path: PAGES.PlayersAnswers,
    loadComponent: () => import('./players-answers/players-answers.component'),
    canActivate: [hasRoomGuard],
  },
  {
    path: PAGES.Result,
    loadComponent: () => import('./result/result.component'),
    canActivate: [hasRoomGuard],
  },
  {
    path: PAGES.Play,
    loadComponent: () => import('./play/play.component'),
    canActivate: [hasRoomGuard],
  },
];
