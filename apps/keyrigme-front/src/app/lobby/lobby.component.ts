import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  Component,
  inject,
  linkedSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { QuizzRpcService } from '../shared/services/quizz-rpc.service';
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
import { RoomConfig } from '@keyrigme/models';

@Component({
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css',
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
})
export default class LobbyComponent {
  private readonly quizzStore = inject(QuizzStore);
  private readonly quizzRpcService = inject(QuizzRpcService);
  private readonly referentielService = inject(ReferentielService);
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly router = inject(Router);

  readonly categoriesIds = this.referentielService.categoriesIds;

  readonly baseUrl = getBaseUrl();

  readonly players = this.quizzStore.players;
  readonly room = this.quizzStore.room;
  readonly isOwner = this.quizzStore.isOwner;

  readonly isItSelf = this.quizzRpcService.isItSelf;
  readonly roomConfig = this.quizzStore.roomConfig;

  readonly playersOptions = PLAYER_OPTIONS;
  readonly quizzSizeOptions = QUIZZ_SIZE_OPTIONS;

  /**
   * Form model linked to the server config. Local writes (from the form) are
   * applied immediately and pushed to the server by the owner; server updates
   * go through the computation, not `set`, so they never trigger an RPC.
   */
  private readonly roomConfigData = linkedSignal(() => this.roomConfig(), {
    set: (value: RoomConfig, rawSet) => {
      rawSet(value);
      if (this.isOwner() && this.room()) {
        void this.quizzRpcService.updateRoomConfig(value);
      }
    },
  });

  readonly roomConfigForm = form(this.roomConfigData, (path) => {
    required(path.noOfPlayers);
    required(path.noOfRounds);
    required(path.categories);
    disabled(path, { when: () => !this.isOwner() });
  });

  startQuizz() {
    void this.quizzRpcService.startQuizz();
  }

  onInviteCopied(copied: boolean) {
    void this.liveAnnouncer.announce(
      copied
        ? "Lien d'invitation copié dans le presse-papiers"
        : "Le lien d'invitation n'a pas pu être copié",
    );
  }

  async leaveRoom() {
    if (await this.quizzRpcService.leaveRoom()) {
      await this.router.navigate(['/']);
    }
  }

  removePlayer(playerId: string) {
    void this.quizzRpcService.removePlayer(playerId);
  }
}
