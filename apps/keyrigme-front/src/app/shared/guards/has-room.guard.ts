import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { QuizzStore } from '../../store/quizz/quizz.store';

export const hasRoomGuard: CanActivateFn = () => {
  const router = inject(Router);
  const quizzStore = inject(QuizzStore);
  const room = quizzStore.room;

  if (room()) {
    return true;
  }

  return new RedirectCommand(router.createUrlTree(['/']));
};
