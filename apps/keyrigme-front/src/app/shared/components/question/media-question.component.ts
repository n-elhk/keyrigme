import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, input, signal, viewChildren } from '@angular/core';
import { IMediaQuestion } from '@keyrigme/keyrigme-models';

@Component({
  selector: 'app-media-question',
  template: `
    @let q = question();
    @if (q.mediaType === 'Image') {
      <div class="grid grid-cols-2 gap-3 px-4">
        @for (file of q.files; track file) {
          <div class="relative w-full aspect-square border-2 border-black overflow-hidden">
            <img [ngSrc]="file" fill alt="" class="object-cover" />
          </div>
        }
      </div>
    } @else {
      <div class="flex flex-col gap-3 px-4">
        @for (file of q.files; track file; let i = $index) {
          <div class="bg-[#1a1a2e] border-2 border-black rounded-md p-3 flex items-center gap-3">
            <button
              type="button"
              class="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center text-sm font-bold shrink-0"
              [class.bg-yellow]="playingIndex() === i"
              [class.bg-white]="playingIndex() !== i"
              [attr.aria-label]="'Lire extrait ' + (i + 1)"
              (click)="togglePlay(i)">
              {{ playingIndex() === i ? '⏸' : '▶' }}
            </button>
            <div class="flex-1">
              <div class="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  class="bg-yellow h-1.5 rounded-full transition-all"
                  [style.width.%]="i === playingIndex() ? progressPercent() : 0">
                </div>
              </div>
            </div>
            <span class="text-gray-400 text-xs font-mono shrink-0">Extrait {{ i + 1 }}</span>
            <audio #audioEl [src]="file"
              (timeupdate)="onTimeUpdate(i, $event)"
              (ended)="onEnded()">
            </audio>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
})
export class MediaQuestionComponent {
  readonly question = input.required<IMediaQuestion>();

  readonly playingIndex = signal<number | null>(null);
  readonly progressPercent = signal(0);

  readonly audioElements = viewChildren<ElementRef<HTMLAudioElement>>('audioEl');

  togglePlay(index: number): void {
    const audios = this.audioElements();
    const current = this.playingIndex();

    if (current !== null && current !== index) {
      audios[current]?.nativeElement.pause();
    }

    const target = audios[index]?.nativeElement;
    if (!target) return;

    if (current === index) {
      target.pause();
      this.playingIndex.set(null);
    } else {
      target.play();
      this.playingIndex.set(index);
    }
  }

  onTimeUpdate(index: number, event: Event): void {
    if (index !== this.playingIndex()) return;
    const audio = event.target as HTMLAudioElement;
    if (audio.duration) {
      this.progressPercent.set((audio.currentTime / audio.duration) * 100);
    }
  }

  onEnded(): void {
    this.playingIndex.set(null);
    this.progressPercent.set(0);
  }
}
