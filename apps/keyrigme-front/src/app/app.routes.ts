import { Route } from '@angular/router';
import { PAGES } from './shared/constants/pages.const';
import { hasRoomGuard } from './shared/guards/has-room.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    title: 'Accueil | Keyrigme',
    loadComponent: () => import('./home/home.component'),
  },
  // { path: '', loadComponent: () => import('./result/result.component') },
  {
    path: PAGES.Lobby,
    title: 'Salon | Keyrigme',
    loadComponent: () => import('./lobby/lobby.component'),
    canActivate: [hasRoomGuard],
  },
  {
    path: PAGES.PlayersAnswers,
    title: 'Correction des réponses | Keyrigme',
    loadComponent: () => import('./players-answers/players-answers.component'),
    canActivate: [hasRoomGuard],
  },
  {
    path: PAGES.Result,
    title: 'Résultats | Keyrigme',
    loadComponent: () => import('./result/result.component'),
    canActivate: [hasRoomGuard],
  },
  {
    path: PAGES.Play,
    title: 'Partie en cours | Keyrigme',
    loadComponent: () => import('./play/play.component'),
    canActivate: [hasRoomGuard],
  },
];
