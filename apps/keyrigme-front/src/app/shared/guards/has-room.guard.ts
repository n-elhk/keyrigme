import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { QuizzStore } from '../../store/quizz/quizz.store';
import { QuizzRpcService } from '../services/quizz-rpc.service';

/** Lets the page open when a room is loaded, resuming the tab's session after a page reload. */
export const hasRoomGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const quizzStore = inject(QuizzStore);
  const quizzRpcService = inject(QuizzRpcService);

  if (quizzStore.room() || ((await quizzRpcService.resumeSession()) && quizzStore.room())) {
    return true;
  }

  return new RedirectCommand(router.createUrlTree(['/']));
};
