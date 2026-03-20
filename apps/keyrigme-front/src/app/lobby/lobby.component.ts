import {
  Component,
  effect,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { CfAvatar } from '../shared/ui/avatar/avatar.component';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatOption, MatSelect } from '@angular/material/select';
import { MatLabel } from '@angular/material/input';
import {
  PLAYER_OPTIONS,
  QUIZZ_SIZE_OPTIONS,
} from '../shared/constants/quizz.const';
import { getBaseUrl } from '../shared/utils/functions/url.fn';
import { CategoriesSelectorComponent } from './categories-selector/categories-selector.component';
import { ReferentielService } from '../shared/services/referentiel.service';
import { QuizzStore } from '../store/quizz/quizz.store';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { RoomConfig } from '@keyrigme/keyrigme-models';

@Component({
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss',
  imports: [
    FormField,
    CfAvatar,
    CdkCopyToClipboard,
    MatButton,
    MatLabel,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatSelect,
    MatOption,
    MatFormField,
    MatIconButton,
    MatIcon,
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

  /**
   * Return previous value to prevent infinite loop in the form
   * when the owner change the config
   */
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
