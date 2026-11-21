import {
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { NgOptimizedImage } from '@angular/common';
import { GameGuideStepperComponent } from './game-guide-stepper/game-guide-stepper.component';
import { CdkStep } from '@angular/cdk/stepper';
import { CfAvatar } from '../shared/ui/avatar';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { AvatarStepperComponent } from './avatar-stepper/avatar-stepper.component';
import { GUIDES } from './game-guide-stepper/guide.mock';
import { AVATARS } from './avatar-stepper/avatars.mock';
import { shuffle } from '../shared/utils/functions/array.fn';
import { QuizzStore } from '../store/quizz/quizz.store';
import { QuizzRpcService } from '../shared/services/quizz-rpc.service';
import { FormField, form, required } from '@angular/forms/signals';

const ERROR_MESSAGES: Record<string, string> = {
  RoomNotFound: "Cette partie n'existe pas.",
  GameAlreadyStarted: 'La partie a déjà commencé.',
  RoomFull: 'La partie est complète.',
  SessionLost: 'La connexion à la partie a été perdue.',
};

@Component({
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [
    FormField,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    CfAvatar,
    NgOptimizedImage,
    GameGuideStepperComponent,
    MatButton,
    MatLabel,
    MatFormField,
    MatInput,
    CdkStep,
    AvatarStepperComponent,
  ],
})
export default class HomeComponent {
  private readonly quizzRpcService = inject(QuizzRpcService);

  readonly errorMessage = computed(() => {
    const error = this.quizzRpcService.lastError();
    if (!error) return '';
    return ERROR_MESSAGES[error._tag] ?? 'Une erreur est survenue, réessayez.';
  });
  private readonly quizzStore = inject(QuizzStore);

  readonly guides = GUIDES;
  readonly avatars = shuffle(AVATARS);

  readonly selectedIndexAvatar = signal(0);

  readonly selectedAvatar = computed(
    () => this.avatars[this.selectedIndexAvatar()]
  );

  readonly code = injectQueryParams('code');

  readonly room = this.quizzStore.room;

  /** True while a room is being created or joined: the buttons are disabled meanwhile. */
  readonly opening = this.quizzRpcService.opening;

  readonly players = this.quizzStore.players;

  private readonly dataForm = linkedSignal({
    source: () => this.code(),
    computation: code => ({
      username: 'PseudoCool8767',
      code: code ?? '',
    }),
  });

  readonly form = form(this.dataForm, path => {
    required(path.username);
    required(path.code);
  });

  createRoom(): void {
    if (this.form.username().valid()) {
      void this.quizzRpcService.createRoom(
        this.form.username().value(),
        this.selectedAvatar()
      );
    }
  }

  joinRoom(): void {
    if (this.form().valid()) {
      void this.quizzRpcService.joinRoom(
        this.form.code().value(),
        this.form.username().value(),
        this.selectedAvatar()
      );
    }
  }
}
