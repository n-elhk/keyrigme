import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QuizzStore } from '../store/quizz/quizz.store';
import { CfAvatar } from '../shared/ui/avatar';

@Component({
  template: `
    <div class="min-h-screen bg-cream px-4 py-8 flex flex-col items-center">
      <div class="w-full max-w-lg">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-black uppercase tracking-[4px] text-black"
              style="text-shadow: 4px 4px 0 #f59e0b">
            Résultats
          </h1>
          <p class="text-xs font-black tracking-[3px] uppercase text-black/60 mt-2">Fin de partie</p>
        </div>
        <div class="flex flex-col gap-3" role="list" aria-label="Classement">
          @for (player of results(); track player.socketId; let i = $index) {
            <div
              role="listitem"
              class="flex items-center gap-4 px-4 py-3 border-[3px] border-black"
              [class]="i === 0 ? 'bg-yellow shadow-[5px_5px_0_#000]' : 'bg-white shadow-[4px_4px_0_#000]'">
              <div
                class="font-black text-xl w-8 h-8 flex items-center justify-center border-[2px] border-black shrink-0"
                [class]="i === 0 ? 'bg-black text-yellow' : 'bg-yellow text-black'">
                {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 }}
              </div>
              <cf-avatar [width]="40" [height]="40" [src]="player.avatar" />
              <span class="font-black text-base flex-1 uppercase tracking-wide">
                {{ player.username }}
              </span>
              <span class="font-black text-lg shrink-0">
                {{ player.point }} pts
              </span>
            </div>
          }
        </div>
        <div class="flex gap-4 mt-8">
          <a href="/" class="neo-btn-black flex-1 py-3 text-sm text-center">
            Accueil
          </a>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CfAvatar],
})
export default class ResultComponent {
  private readonly quizzStore = inject(QuizzStore);
  readonly results = computed(() =>
    this.quizzStore.playersPoint().sort((a, b) => b.point - a.point)
  );
}
