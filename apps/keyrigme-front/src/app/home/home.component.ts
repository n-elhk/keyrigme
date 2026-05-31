import {
  ChangeDetectionStrategy,
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
import { AvatarStepperComponent } from './avatar-stepper/avatar-stepper.component';
import { GUIDES } from './game-guide-stepper/guide.mock';
import { AVATARS } from './avatar-stepper/avatars.mock';
import { shuffle } from '../shared/utils/functions/array.fn';
import { QuizzStore } from '../store/quizz/quizz.store';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { FormField, form, required } from '@angular/forms/signals';

@Component({
  template: `
    <div class="min-h-screen bg-cream px-4 py-8">
      <header class="text-center mb-8">
        <img style="max-width: 280px" class="mx-auto" src="images/logo/keyrigme.png" alt="Keyrigme" />
        <p class="text-xs font-black tracking-[4px] uppercase text-black/60 mt-2">Le quiz entre amis</p>
      </header>
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <div class="neo-card p-5 flex flex-col gap-4">
          <p class="text-xs font-black tracking-[3px] uppercase">Choisis ton avatar</p>
          <app-avatar-stepper [(selectedIndex)]="selectedIndexAvatar">
            @for (item of avatars; track item) {
              <cdk-step>
                <cf-avatar [src]="item" [width]="110" [height]="110" />
              </cdk-step>
            }
          </app-avatar-stepper>
          <div>
            <label for="username" class="block text-xs font-black tracking-[3px] uppercase mb-2">Ton pseudo</label>
            <input type="text" id="username" class="neo-input" [formField]="form.username"
              placeholder="PseudoCool8767" aria-label="Choisis un pseudo" />
          </div>
          <div class="flex gap-3 mt-2">
            @if (code()) {
              <button type="button"
                class="neo-btn-yellow flex-1 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                [disabled]="!form.username().valid() || !form.code().valid()"
                (click)="joinRoom()">Rejoindre</button>
            } @else {
              <button type="button"
                class="neo-btn-yellow flex-1 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                [disabled]="!form.username().valid()"
                (click)="createRoom()">Démarrer</button>
            }
          </div>
        </div>
        <div class="neo-card p-5">
          <p class="text-xs font-black tracking-[3px] uppercase mb-4 border-b-[2px] border-black pb-3">Comment jouer ?</p>
          <app-game-guide-stepper>
            @for (guide of guides; let i = $index; track guide) {
              <cdk-step>
                <div class="flex flex-col items-center gap-3 text-center px-2">
                  <img [ngSrc]="guide.src" width="80" height="64" alt="" class="mx-auto" />
                  <div class="flex items-start gap-3 text-left">
                    <span class="bg-yellow border-[2px] border-black w-6 h-6 flex items-center justify-center font-black text-xs shrink-0">{{ i + 1 }}</span>
                    <div>
                      <p class="font-black text-sm uppercase tracking-wide">{{ guide.title }}</p>
                      <p class="text-sm font-bold text-black/70 mt-1">{{ guide.description }}</p>
                    </div>
                  </div>
                </div>
              </cdk-step>
            }
          </app-game-guide-stepper>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    CfAvatar,
    NgOptimizedImage,
    AnswerStepperComponent,
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
  readonly selectedAvatar = computed(() => this.avatars[this.selectedIndexAvatar()]);

  readonly code = injectQueryParams('code');
  readonly room = this.quizzStore.room;
  readonly players = this.quizzStore.players;

  private readonly dataForm = linkedSignal({
    source: () => this.code(),
    computation: (code) => ({
      username: 'PseudoCool8767',
      code: code ?? '',
    }),
  });

  readonly form = form(this.dataForm, (path) => {
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
