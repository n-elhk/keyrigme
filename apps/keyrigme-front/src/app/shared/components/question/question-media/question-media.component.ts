import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { MediaTypesValues } from '@keyrigme/models';

/** Files of a `Media` question: a grid of images, or one audio player per extract. */
@Component({
  selector: 'app-question-media',
  imports: [NgOptimizedImage],
  template: `
    @if (mediaType() === 'Image') {
      <ul class="images" [class.single]="files().length === 1">
        @for (file of files(); track file; let index = $index) {
          <li class="image">
            <img [ngSrc]="file" fill [alt]="'Image ' + (index + 1) + ' de la question'" />
          </li>
        }
      </ul>
    } @else {
      <ol class="extracts">
        @for (file of files(); track file; let index = $index) {
          <li class="extract">
            <span [id]="'extract-' + index">Extrait {{ index + 1 }}</span>
            <audio controls preload="metadata" [src]="file" [attr.aria-labelledby]="'extract-' + index"></audio>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 0 1rem 1rem;
    }

    ul,
    ol {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .images {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;

      &.single {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    .image {
      position: relative;
      aspect-ratio: 16 / 10;

      img {
        object-fit: contain;
      }
    }

    .extracts {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      font-size: 1rem;
    }

    .extract {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      width: min(100%, 28rem);

      audio {
        width: 100%;
      }
    }
  `,
})
export class QuestionMediaComponent {
  readonly mediaType = input.required<MediaTypesValues>();
  readonly files = input.required<ReadonlyArray<string>>();
}
