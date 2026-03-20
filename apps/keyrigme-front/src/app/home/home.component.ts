import {
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { NgOptimizedImage } from '@angular/common';
import { AnswerStepperComponent } from './game-guide-stepper/game-guide-stepper.component';
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
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { FormField, form, required } from '@angular/forms/signals';

@Component({
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    FormField,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    CfAvatar,
    NgOptimizedImage,
    AnswerStepperComponent,
    MatButton,
    MatLabel,
    MatFormField,
    MatInput,
    CdkStep,
    AvatarStepperComponent,
  ],
})
export default class HomeComponent {
  private readonly quizzSocketService = inject(QuizzSocketService);
  private readonly quizzStore = inject(QuizzStore);

  readonly guides = GUIDES;
  readonly avatars = shuffle(AVATARS);

  readonly selectedIndexAvatar = signal(0);

  readonly selectedAvatar = computed(
    () => this.avatars[this.selectedIndexAvatar()]
  );

  readonly code = injectQueryParams('code');

  readonly room = this.quizzStore.room;

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
      this.quizzSocketService.createRoom(
        this.form.username().value(),
        this.selectedAvatar()
      );
    }
  }

  joinRoom(): void {
    if (this.form().valid()) {
      this.quizzSocketService.joinRoom(
        this.form.code().value(),
        this.form.username().value(),
        this.selectedAvatar()
      );
    }
  }
}
