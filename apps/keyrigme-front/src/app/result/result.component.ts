import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { RoomStatus } from '@keyrigme/models';
import { QuizzStore } from '../store/quizz/quizz.store';
import { QuizzRpcService } from '../shared/services/quizz-rpc.service';
import { PAGES } from '../shared/constants/pages.const';
import { CfAvatar } from '../shared/ui/avatar';

@Component({
  templateUrl: './result.component.html',
  styleUrl: './result.component.css',
  imports: [MatTableModule, MatButton, CfAvatar],
})
export default class ResultComponent {
  private readonly quizzStore = inject(QuizzStore);
  private readonly quizzRpcService = inject(QuizzRpcService);
  private readonly router = inject(Router);

  readonly isOwner = this.quizzStore.isOwner;
  /** Players sorted by points, best first (copied so the store state is not mutated). */
  readonly results = computed(() => [...this.quizzStore.playersPoint()].sort((a, b) => b.point - a.point));

  readonly displayedColumns: string[] = ['position', 'avatar', 'username', 'point'];

  /** True while a request (replay or leave) is pending: a second click is ignored. */
  readonly pending = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    // The `QuizzReset` event is missed by a player who was not connected when the owner replayed
    // (page reload, connection lost): the room they resume is back in the lobby, so are they.
    effect(() => {
      if (this.quizzStore.room()?.status === RoomStatus.Initial) {
        void this.router.navigate([PAGES.Lobby]);
      }
    });
  }

  /** Brings every player back to the lobby, through the `QuizzReset` event. */
  async replay() {
    if (this.pending()) return;
    this.pending.set(true);
    this.errorMessage.set('');
    const ok = await this.quizzRpcService.replayQuizz();
    this.pending.set(false);
    if (!ok) this.errorMessage.set("La nouvelle partie n'a pas pu être lancée, réessayez.");
  }

  async leaveRoom() {
    if (this.pending()) return;
    this.pending.set(true);
    this.errorMessage.set('');
    const ok = await this.quizzRpcService.leaveRoom();
    this.pending.set(false);
    if (ok) {
      await this.router.navigate(['/']);
    } else {
      this.errorMessage.set("Impossible de quitter la partie, réessayez.");
    }
  }
}
