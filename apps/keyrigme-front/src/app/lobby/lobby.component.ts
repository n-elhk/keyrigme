import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { CfAvatar } from '../shared/ui/avatar/avatar.component';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { PLAYER_OPTIONS, QUIZZ_SIZE_OPTIONS } from '../shared/constants/quizz.const';
import { getBaseUrl } from '../shared/utils/functions/url.fn';
import { CategoriesSelectorComponent } from './categories-selector/categories-selector.component';
import { ReferentielService } from '../shared/services/referentiel.service';
import { QuizzStore } from '../store/quizz/quizz.store';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { RoomConfig } from '@keyrigme/keyrigme-models';

@Component({
  template: `
    @let roomValue = room();
    @let isOwnerValue = isOwner();
    @if (roomValue) {
      <div class="min-h-screen bg-cream px-4 py-6">
        <header class="bg-black text-cream px-5 py-4 flex items-center justify-between mb-6 border-[3px] border-black shadow-[4px_4px_0_#f59e0b]">
          <span class="font-black text-xl tracking-[3px] uppercase text-yellow">KEYRIGME</span>
          <div class="flex gap-3">
            <button type="button" class="neo-btn-black text-xs py-2 px-4"
              [cdkCopyToClipboard]="\`\${baseUrl}?code=\${roomValue.code}\`"
              aria-label="Copier le lien d'invitation">Copier le lien</button>
            <button type="button"
              class="neo-btn-yellow text-xs py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              [disabled]="!isOwnerValue || !roomConfigForm().valid()"
              (click)="startQuizz()">Démarrer</button>
          </div>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div class="neo-card p-5">
            <p class="text-xs font-black tracking-[3px] uppercase mb-4 border-b-[2px] border-black pb-2">
              Joueurs {{ players().length }} / {{ roomConfigForm.noOfPlayers().value() }}
            </p>
            @if (isOwnerValue) {
              <div class="mb-4">
                <label for="noOfPlayers-options" class="block text-xs font-black tracking-[2px] uppercase mb-2">Nombre de joueurs max</label>
                <select id="noOfPlayers-options" class="neo-select"
                  [formField]="$any(roomConfigForm.noOfPlayers)"
                  aria-label="Nombre de joueurs">
                  @for (option of playersOptions; track $index) {
                    <option [value]="option">{{ option }} Joueurs</option>
                  }
                </select>
              </div>
            }
            <div class="flex flex-col gap-2">
              @for (player of players(); track player.socketId) {
                <div class="flex items-center gap-3 bg-cream border-[2px] border-black px-3 py-2">
                  <cf-avatar [width]="36" [height]="36" [src]="player.avatar">
                    @if (isOwner() && !isItSelf(player.socketId)) {
                      <button type="button" avatar-icon-end
                        class="w-5 h-5 bg-red-invalid text-white border-[2px] border-black flex items-center justify-center text-xs font-black leading-none"
                        (click)="removePlayer(player.socketId)"
                        [attr.aria-label]="'Expulser ' + player.username">×</button>
                    }
                  </cf-avatar>
                  <span class="font-black text-sm">{{ player.username }}</span>
                  @if (isItSelf(player.socketId) && isOwnerValue) {
                    <span class="neo-badge ml-auto">HOST</span>
                  }
                </div>
              }
            </div>
          </div>
          <div class="neo-card p-5 flex flex-col gap-4">
            <p class="text-xs font-black tracking-[3px] uppercase border-b-[2px] border-black pb-2">Configuration</p>
            <div>
              <label for="noOfRounds-options" class="block text-xs font-black tracking-[2px] uppercase mb-2">Nombre de questions</label>
              <select id="noOfRounds-options" class="neo-select"
                [formField]="$any(roomConfigForm.noOfRounds)"
                aria-label="Nombre de questions">
                @for (option of quizzSizeOptions; track $index) {
                  <option [value]="option">{{ option }} Questions</option>
                }
              </select>
            </div>
            <div>
              <p class="text-xs font-black tracking-[2px] uppercase mb-2">Catégories</p>
              <app-categories-selector [options]="categoriesIds()" [formField]="roomConfigForm.categories" />
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    CfAvatar,
    CdkCopyToClipboard,
    CategoriesSelectorComponent,
  ],
  host: {
    '(window:beforeunload)': 'leaveRoom()',
  },
})
export default class LobbyComponent {
  private readonly quizzStore = inject(QuizzStore);
  private readonly quizzSocketService = inject(QuizzSocketService);
  private readonly referentielService = inject(ReferentielService);

  readonly categoriesIds = this.referentielService.categoriesIds;
  readonly baseUrl = getBaseUrl();
  readonly players = this.quizzStore.players;
  readonly room = this.quizzStore.room;
  readonly isOwner = this.quizzStore.isOwner;
  readonly isItSelf = this.quizzSocketService.isItSelf;
  readonly roomConfig = this.quizzStore.roomConfig;
  readonly playersOptions = PLAYER_OPTIONS;
  readonly quizzSizeOptions = QUIZZ_SIZE_OPTIONS;

  private readonly updateRoomconfigEffect = effect(() => {
    if (this.isOwner()) {
      const room = untracked(this.room);
      const formValue = this.roomConfigForm().value();
      if (room) {
        this.quizzSocketService.updateRoomConfig(room._id, formValue);
      }
    }
  });

  private readonly roomConfigData = linkedSignal<RoomConfig, RoomConfig>({
    source: () => this.roomConfig(),
    computation: (roomConfig, previous) =>
      previous ? previous.value : roomConfig,
  });

  readonly roomConfigForm = form(this.roomConfigData, (path) => {
    required(path.noOfPlayers);
    required(path.noOfRounds);
    required(path.categories);
    disabled(path, () => !this.isOwner());
  });

  startQuizz() {
    const room = this.room();
    if (room) {
      this.quizzSocketService.startQuizz(room._id);
    }
  }

  leaveRoom() {
    const room = this.room();
    if (room) {
      this.quizzSocketService.leaveRoom(room._id);
    }
  }

  removePlayer(playerId: string) {
    const room = this.room();
    if (room) {
      this.quizzSocketService.removePlayer(room._id, playerId);
    }
  }
}
