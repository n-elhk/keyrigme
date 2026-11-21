# Media & Order Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le support des questions Media multi-fichiers (grille images + lecteur audio) et des questions Order (drag & drop images+labels, correction manuelle admin).

**Architecture:** Discriminateurs Mongoose sur la collection `questions` avec `discriminatorKey: 'type'`. Union discriminée TypeScript dans `keyrigme-models`. Nouveaux composants Angular pour l'affichage et la correction.

**Tech Stack:** NestJS + Mongoose discriminators, Angular CDK DragDrop, `<audio>` natif, NgOptimizedImage, @ngrx/signals

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `libs/keyrigme-models/src/lib/types/question.type.ts` | Modifier — union discriminée + type guards |
| `libs/keyrigme-models/src/lib/types/index.ts` | Modifier — exporter les nouveaux types |
| `apps/keyrigme-back/src/app/features/quizz/schemas/question.schema.ts` | Modifier — base avec discriminatorKey |
| `apps/keyrigme-back/src/app/features/quizz/schemas/media-question.schema.ts` | Créer |
| `apps/keyrigme-back/src/app/features/quizz/schemas/order-question.schema.ts` | Créer |
| `apps/keyrigme-back/src/app/features/quizz/quizz.module.ts` | Modifier — enregistrer discriminateurs |
| `apps/keyrigme-back/src/app/features/quizz/quizz.controller.ts` | Modifier — seed avec files[] |
| `apps/keyrigme-front/src/app/shared/components/question/question.component.ts` | Modifier — dispatcher |
| `apps/keyrigme-front/src/app/shared/components/question/media-question.component.ts` | Créer |
| `apps/keyrigme-front/src/app/shared/components/question/order-question.component.ts` | Créer |
| `apps/keyrigme-front/src/app/play/play.component.ts` | Modifier — soumettre order en JSON |
| `apps/keyrigme-front/src/app/players-answers/order-review.component.ts` | Créer |
| `apps/keyrigme-front/src/app/players-answers/players-answers.component.ts` | Modifier — afficher order-review |

---

## Task 1 : Types partagés — union discriminée

**Files:**
- Modify: `libs/keyrigme-models/src/lib/types/question.type.ts`
- Modify: `libs/keyrigme-models/src/lib/types/index.ts`

- [ ] **Réécrire `question.type.ts`**

```typescript
// libs/keyrigme-models/src/lib/types/question.type.ts
import { MediaTypes, QuestionCategories, QuestionTypes } from '../constants';

export type MediaTypesValues = keyof typeof MediaTypes;
export type QuestionTypesValues = keyof typeof QuestionTypes;
export type QuestionCategoriesValues = keyof typeof QuestionCategories;

export interface IBaseQuestion {
  _id: string;
  title: string;
  point: number;
  timer: number;
  categories: QuestionCategoriesValues[];
  type: QuestionTypesValues;
  createdAt: string;
  updatedAt: string;
}

export interface IMediaQuestion extends IBaseQuestion {
  type: 'Media';
  mediaType: MediaTypesValues;
  files: string[];
  answer: string;
}

export interface IOrderItem {
  _id: string;
  label: string;
  file: string;
}

export interface IOrderQuestion extends IBaseQuestion {
  type: 'Order';
  orderItems: IOrderItem[];
  answer: string[];
}

export interface ITextQuestion extends IBaseQuestion {
  type: 'Text';
  answer: string;
}

export type IQuestion = IMediaQuestion | IOrderQuestion | ITextQuestion;

export type QuestionWithoutId =
  | Omit<IMediaQuestion, '_id'>
  | Omit<IOrderQuestion, '_id'>
  | Omit<ITextQuestion, '_id'>;

export type CategoryReferentiel = {
  id: QuestionCategoriesValues;
  label: string;
  count: number;
};

export function isMediaQuestion(q: IQuestion): q is IMediaQuestion {
  return q.type === 'Media';
}

export function isOrderQuestion(q: IQuestion): q is IOrderQuestion {
  return q.type === 'Order';
}

export function isTextQuestion(q: IQuestion): q is ITextQuestion {
  return q.type === 'Text';
}
```

- [ ] **Mettre à jour `libs/keyrigme-models/src/lib/types/index.ts`**

```typescript
export type {
  CategoryReferentiel,
  IBaseQuestion,
  IMediaQuestion,
  IOrderItem,
  IOrderQuestion,
  IQuestion,
  ITextQuestion,
  MediaTypesValues,
  QuestionCategoriesValues,
  QuestionTypesValues,
  QuestionWithoutId,
} from './question.type';

export {
  isMediaQuestion,
  isOrderQuestion,
  isTextQuestion,
} from './question.type';
```

- [ ] **Vérifier la compilation**

```bash
pnpm nx build keyrigme-models
```

Expected: BUILD SUCCESS sans erreurs TypeScript.

- [ ] **Commit**

```bash
git add libs/keyrigme-models/src/lib/types/
git commit -m "feat(models): discriminated union types for Media, Order, Text questions"
```

---

## Task 2 : Backend — schéma base avec discriminatorKey

**Files:**
- Modify: `apps/keyrigme-back/src/app/features/quizz/schemas/question.schema.ts`

- [ ] **Réécrire `question.schema.ts` — schéma de base uniquement**

```typescript
// apps/keyrigme-back/src/app/features/quizz/schemas/question.schema.ts
import { QuestionCategories, QuestionTypes } from '@keyrigme/keyrigme-models';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema({ discriminatorKey: 'type' })
export class Question {
  @Prop({ type: String, required: true })
  public title: string;

  @Prop({ type: Number, required: true, default: 3 })
  public point: number;

  @Prop({ type: Number, default: 10_000 })
  public timer: number;

  @Prop({
    type: [String],
    default: [QuestionCategories.OLD_TESTIMONY, QuestionCategories.NEW_TESTIMONY],
  })
  public categories: string[];

  @Prop({
    type: String,
    enum: Object.values(QuestionTypes),
    required: true,
  })
  public type: string;

  @Prop({ default: () => new Date().toISOString() })
  public createdAt: string;

  @Prop({ default: () => new Date().toISOString() })
  public updatedAt: string;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
```

- [ ] **Vérifier la compilation backend**

```bash
pnpm nx build keyrigme-back
```

Expected: BUILD SUCCESS. Si erreur, c'est que `QuestionService` ou `QuizzGateway` utilisent des champs supprimés du schéma base (`answer`, `file`, etc.) — ils resteront valides après ajout des discriminateurs.

---

## Task 3 : Backend — schéma MediaQuestion

**Files:**
- Create: `apps/keyrigme-back/src/app/features/quizz/schemas/media-question.schema.ts`

- [ ] **Créer `media-question.schema.ts`**

```typescript
// apps/keyrigme-back/src/app/features/quizz/schemas/media-question.schema.ts
import { MediaTypes } from '@keyrigme/keyrigme-models';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Question } from './question.schema';

@Schema()
export class MediaQuestion extends Question {
  @Prop({ type: [String], default: [] })
  public files: string[];

  @Prop({
    type: String,
    enum: Object.values(MediaTypes),
    default: MediaTypes.Image,
  })
  public mediaType: string;

  @Prop({ type: String, required: true })
  public answer: string;
}

export const MediaQuestionSchema = SchemaFactory.createForClass(MediaQuestion);
```

---

## Task 4 : Backend — schéma OrderQuestion

**Files:**
- Create: `apps/keyrigme-back/src/app/features/quizz/schemas/order-question.schema.ts`

- [ ] **Créer `order-question.schema.ts`**

```typescript
// apps/keyrigme-back/src/app/features/quizz/schemas/order-question.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Question } from './question.schema';

// Sous-schéma explicite pour que Mongoose génère un _id par item
const OrderItemSchema = new MongooseSchema({
  label: { type: String, required: true },
  file: { type: String, required: true },
});

@Schema()
export class OrderQuestion extends Question {
  @Prop({ type: [OrderItemSchema], default: [] })
  public orderItems: { _id: string; label: string; file: string }[];

  @Prop({ type: [String], default: [] })
  public answer: string[];
}

export const OrderQuestionSchema = SchemaFactory.createForClass(OrderQuestion);
```

---

## Task 5 : Backend — enregistrer discriminateurs + mettre à jour le seed

**Files:**
- Modify: `apps/keyrigme-back/src/app/features/quizz/quizz.module.ts`
- Modify: `apps/keyrigme-back/src/app/features/quizz/quizz.controller.ts`

- [ ] **Mettre à jour `quizz.module.ts`**

```typescript
// apps/keyrigme-back/src/app/features/quizz/quizz.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizzGateway } from './gateway/quizz.gateway';
import { RoomService } from './services/room.service';
import { Room, RoomSchema } from './schemas/room.schema';
import { QuestionService } from './services/question.service';
import { Question, QuestionSchema } from './schemas/question.schema';
import { MediaQuestion, MediaQuestionSchema } from './schemas/media-question.schema';
import { OrderQuestion, OrderQuestionSchema } from './schemas/order-question.schema';
import { QuizzProducerService } from './services/quizz-producer.service';
import { rabbitMqOptionsConfig } from '../../../config/rabbit.config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { QuizzController } from './quizz.controller';

@Module({
  imports: [
    RabbitMQModule.forRoot(rabbitMqOptionsConfig()),
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      {
        name: Question.name,
        schema: QuestionSchema,
        discriminators: [
          { name: MediaQuestion.name, schema: MediaQuestionSchema },
          { name: OrderQuestion.name, schema: OrderQuestionSchema },
        ],
      },
    ]),
  ],
  controllers: [QuizzController],
  providers: [QuizzProducerService, QuizzGateway, RoomService, QuestionService],
})
export class QuizzModule {}
```

- [ ] **Mettre à jour le seed dans `quizz.controller.ts`**

Remplacer toute la constante `SEED_QUESTIONS` et le type des imports. Les questions seed n'ont plus `file` — elles ont `files` (tableau). Le `type` doit être `QuestionTypes.Media`.

```typescript
// apps/keyrigme-back/src/app/features/quizz/quizz.controller.ts
import { Controller, Get, Logger } from '@nestjs/common';
import { QuestionService } from './services/question.service';
import {
  MediaTypes,
  QuestionCategories,
  QuestionTypes,
  QuestionWithoutId,
} from '@keyrigme/keyrigme-models';

const SEED_QUESTIONS: QuestionWithoutId[] = [
  {
    title: "Qui a construit l'arche selon la Bible ?",
    answer: 'Noé',
    point: 3,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Combien de jours Dieu a-t-il mis pour créer le monde ?',
    answer: '6 jours',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Quel est le premier livre de la Bible ?',
    answer: 'La Genèse',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Qui a écrit les évangiles de Matthieu, Marc, Luc et Jean ?",
    answer: 'Les quatre évangélistes',
    point: 3,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Dans quelle ville Jésus est-il né ?',
    answer: 'Bethléem',
    point: 1,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Combien d'apôtres Jésus a-t-il choisis ?",
    answer: '12',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Quel père de l'Église a écrit les Confessions ?",
    answer: 'Saint Augustin',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.CHURCH_FATHERS],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Qui est l\'auteur de la Somme Théologique ?',
    answer: "Saint Thomas d'Aquin",
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.CHURCH_FATHERS],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "En quelle année a eu lieu le Grand Schisme d'Orient ?",
    answer: '1054',
    point: 5,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.HISTORY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Quel concile a défini le dogme de l'Immaculée Conception ?",
    answer: "Ce n'est pas un concile mais le pape Pie IX en 1854",
    point: 5,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.HISTORY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 25000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Quel saint est le patron de la France ?',
    answer: 'Saint Denis',
    point: 3,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.SAINT],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Sainte Thérèse de l'Enfant-Jésus est originaire de quelle ville ?",
    answer: 'Alençon',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.SAINT],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Combien de sacrements compte l'Église catholique ?",
    answer: '7',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.TRADITION],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Quel est le premier sacrement de l'initiation chrétienne ?",
    answer: 'Le baptême',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.TRADITION],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Combien de livres compte la Bible catholique ?',
    answer: '73',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY, QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

@Controller('quizz')
export class QuizzController {
  private readonly logger = new Logger(QuizzController.name);

  constructor(private readonly questionService: QuestionService) {}

  @Get('count-by-category')
  async getCountByCategory() {
    this.logger.log('Fetching count by category');
    return this.questionService.countByCategory();
  }

  @Get('seed')
  async seed() {
    this.logger.log('Seeding questions');
    const questions = await this.questionService.insertMany(SEED_QUESTIONS);
    return { inserted: questions.length };
  }
}
```

- [ ] **Builder et vérifier**

```bash
pnpm nx build keyrigme-back
```

Expected: BUILD SUCCESS.

- [ ] **Commit**

```bash
git add apps/keyrigme-back/src/app/features/quizz/
git commit -m "feat(back): mongoose discriminators for Media and Order question schemas"
```

---

## Task 6 : Frontend — composant MediaQuestion

**Files:**
- Create: `apps/keyrigme-front/src/app/shared/components/question/media-question.component.ts`

- [ ] **Créer `media-question.component.ts`**

```typescript
// apps/keyrigme-front/src/app/shared/components/question/media-question.component.ts
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
```

---

## Task 7 : Frontend — composant OrderQuestion (drag & drop)

**Files:**
- Create: `apps/keyrigme-front/src/app/shared/components/question/order-question.component.ts`

- [ ] **Créer `order-question.component.ts`**

```typescript
// apps/keyrigme-front/src/app/shared/components/question/order-question.component.ts
import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  model,
  untracked,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { IOrderItem, IOrderQuestion } from '@keyrigme/keyrigme-models';
import { shuffle } from '../../utils/functions/array.fn';

@Component({
  selector: 'app-order-question',
  template: `
    <div class="px-4">
      <p class="text-xs text-black/50 text-center mb-3 font-medium">
        Glisse les cartes pour les ordonner
      </p>
      <div
        cdkDropList
        class="flex flex-col gap-2"
        (cdkDropListDropped)="drop($event)">
        @for (item of orderedItems(); track item._id) {
          <div
            cdkDrag
            class="neo-card p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing">
            <span cdkDragHandle class="text-xl text-black/30 shrink-0 cursor-grab" aria-hidden="true">⠿</span>
            <div class="relative w-9 h-9 border-2 border-black overflow-hidden shrink-0">
              <img [ngSrc]="item.file" fill alt="" class="object-cover" />
            </div>
            <span class="text-sm font-bold">{{ item.label }}</span>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropList, CdkDrag, CdkDragHandle, NgOptimizedImage],
})
export class OrderQuestionComponent {
  readonly question = input.required<IOrderQuestion>();
  readonly orderedIds = model<string[]>([]);

  readonly orderedItems = linkedSignal(() => shuffle([...this.question().orderItems]));

  constructor() {
    effect(() => {
      const _ = this.question();
      untracked(() => this.orderedIds.set(this.orderedItems().map((i) => i._id)));
    });
  }

  drop(event: CdkDragDrop<IOrderItem[]>): void {
    const items = [...this.orderedItems()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.orderedItems.set(items);
    this.orderedIds.set(items.map((i) => i._id));
  }
}
```

---

## Task 8 : Frontend — mettre à jour QuestionComponent (dispatcher)

**Files:**
- Modify: `apps/keyrigme-front/src/app/shared/components/question/question.component.ts`

- [ ] **Modifier `question.component.ts`**

```typescript
// apps/keyrigme-front/src/app/shared/components/question/question.component.ts
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { IMediaQuestion, IOrderQuestion, IQuestion, isMediaQuestion, isOrderQuestion } from '@keyrigme/keyrigme-models';
import { MediaQuestionComponent } from './media-question.component';
import { OrderQuestionComponent } from './order-question.component';

@Component({
  selector: 'app-question',
  template: `
    @let questionValue = question();
    <div class="flex flex-col gap-4 w-full max-w-lg mx-auto px-4 py-6">
      <ng-content select="[question-header]"></ng-content>
      <div class="neo-card p-5 text-center">
        <h1 class="text-xl font-black uppercase tracking-wide leading-snug">
          {{ questionValue.title }}
        </h1>
      </div>
      @if (asMedia(); as mq) {
        <app-media-question [question]="mq" />
      } @else if (asOrder(); as oq) {
        <app-order-question [question]="oq" [(orderedIds)]="orderedIds" />
      }
      <ng-content select="[question-footer]"></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MediaQuestionComponent, OrderQuestionComponent],
})
export class QuestionComponent {
  readonly question = input.required<IQuestion>();
  readonly orderedIds = model<string[]>([]);

  readonly asMedia = computed<IMediaQuestion | null>(() => {
    const q = this.question();
    return isMediaQuestion(q) ? q : null;
  });

  readonly asOrder = computed<IOrderQuestion | null>(() => {
    const q = this.question();
    return isOrderQuestion(q) ? q : null;
  });
}
```

- [ ] **Vérifier la compilation frontend**

```bash
pnpm nx build keyrigme-front
```

Expected: BUILD SUCCESS.

- [ ] **Commit**

```bash
git add apps/keyrigme-front/src/app/shared/components/question/
git commit -m "feat(front): media-question and order-question components"
```

---

## Task 9 : Frontend — mettre à jour PlayComponent pour les questions Order

**Files:**
- Modify: `apps/keyrigme-front/src/app/play/play.component.ts`

La logique actuelle : le joueur saisit du texte → au changement de round, la réponse est soumise via socket.

Pour les questions Order : pas de champ texte, la réponse est l'ordre courant des items (JSON array d'`_id`). On stocke cet ordre dans un signal `currentOrderedIds`.

- [ ] **Modifier `play.component.ts`**

```typescript
// apps/keyrigme-front/src/app/play/play.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { filter, map, merge, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { countdown } from '../shared/utils/rxjs/countdown.rx';
import { msToSecond, timeToPercent } from '../shared/utils/functions/number.fn';
import { QuestionComponent } from '../shared/components/question/question.component';
import { QuizzStore } from '../store/quizz/quizz.store';
import { FormField, form } from '@angular/forms/signals';
import { IQuestion, isOrderQuestion } from '@keyrigme/keyrigme-models';

@Component({
  template: `
    @let question = currentQuestion();
    @if (question) {
      <app-question [question]="question" [(orderedIds)]="currentOrderedIds">
        <ng-container question-header>
          <div class="flex items-center gap-3 w-full px-4 pt-4">
            <div
              class="flex-1 h-3 bg-white border-[2px] border-black overflow-hidden"
              role="progressbar"
              [attr.aria-valuenow]="percent()"
              aria-valuemin="0"
              aria-valuemax="100">
              <div class="h-full bg-yellow transition-all duration-100" [style.width.%]="percent()"></div>
            </div>
            <span class="neo-badge shrink-0">{{ countdown() }}s</span>
          </div>
        </ng-container>
        <ng-container question-footer>
          @if (!isOrder()) {
            <div class="px-4 pb-6 flex flex-col gap-4">
              <div>
                <label for="reponse" class="block text-xs font-black tracking-[2px] uppercase mb-2">
                  Ta réponse
                </label>
                <input
                  type="text"
                  id="reponse"
                  class="neo-input text-center text-lg"
                  [formField]="reponseForm"
                  placeholder="Écris ta réponse…"
                  aria-label="Ta réponse" />
              </div>
              @if (quizzEnded()) {
                <button type="button" class="neo-btn-black w-full py-3 text-sm" (click)="showAnswers()">
                  Voir les réponses
                </button>
              }
            </div>
          } @else {
            @if (quizzEnded()) {
              <div class="px-4 pb-6">
                <button type="button" class="neo-btn-black w-full py-3 text-sm" (click)="showAnswers()">
                  Voir les réponses
                </button>
              </div>
            }
          }
        </ng-container>
      </app-question>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuestionComponent, FormField],
})
export default class PlayComponent {
  private readonly quizzStore = inject(QuizzStore);
  private readonly quizzSocketService = inject(QuizzSocketService);

  readonly room = this.quizzStore.room;

  readonly currentQuestion = computed<IQuestion | null>(() => {
    const questionsValue = this.quizzStore.questions();
    return questionsValue[questionsValue.length - 1] ?? null;
  });

  readonly previousQuestion = computed<IQuestion | null>(() => {
    const questionsValue = this.quizzStore.questions();
    return questionsValue[questionsValue.length - 2] ?? null;
  });

  readonly isOrder = computed(() => {
    const q = this.currentQuestion();
    return q ? isOrderQuestion(q) : false;
  });

  private readonly response = signal('');
  readonly reponseForm = form(this.response);

  readonly currentOrderedIds = signal<string[]>([]);

  private getResponsePayload(question: IQuestion): string {
    return isOrderQuestion(question)
      ? JSON.stringify(this.currentOrderedIds())
      : this.reponseForm().value();
  }

  private readonly countdown$ = toObservable(this.currentQuestion).pipe(
    filter((question) => !!question),
    switchMap(({ timer }) =>
      countdown(timer).pipe(map((elapsedTime) => [elapsedTime, timer]))
    ),
  );

  readonly countdown = toSignal(
    this.countdown$.pipe(map(([time]) => msToSecond(time))),
    { initialValue: 0 },
  );

  private readonly percent$ = this.countdown$.pipe(
    map(([time, questionTimer]) => timeToPercent(time, questionTimer)),
  );

  readonly percent = toSignal(this.percent$, { initialValue: 0 });

  readonly quizzEnd$ = this.quizzSocketService.onEndQuizz().pipe(map(() => true));
  readonly quizzEnded = toSignal(this.quizzEnd$, { initialValue: false });

  private readonly sendResponse$ = merge(
    this.quizzSocketService.newRoundData().pipe(map(() => this.previousQuestion())),
    this.quizzEnd$.pipe(map(() => this.currentQuestion())),
  ).pipe(
    tap((question) => {
      const room = this.room();
      if (room && question) {
        this.quizzSocketService.playerAnswer(
          room._id,
          question._id,
          this.getResponsePayload(question),
        );
        this.reponseForm().value.set('');
        this.currentOrderedIds.set([]);
      }
    }),
  );

  constructor() {
    this.sendResponse$.pipe(takeUntilDestroyed()).subscribe();
  }

  showAnswers() {
    const room = this.room();
    if (room) {
      this.quizzSocketService.showAnswers(room._id);
    }
  }
}
```

- [ ] **Vérifier la compilation**

```bash
pnpm nx build keyrigme-front
```

Expected: BUILD SUCCESS.

- [ ] **Commit**

```bash
git add apps/keyrigme-front/src/app/play/play.component.ts
git commit -m "feat(front): handle Order question submission in play screen"
```

---

## Task 10 : Frontend — composant OrderReview (écran correction)

**Files:**
- Create: `apps/keyrigme-front/src/app/players-answers/order-review.component.ts`

- [ ] **Créer `order-review.component.ts`**

```typescript
// apps/keyrigme-front/src/app/players-answers/order-review.component.ts
import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IOrderItem, IOrderQuestion } from '@keyrigme/keyrigme-models';

@Component({
  selector: 'app-order-review',
  template: `
    <div class="grid grid-cols-2 gap-3 px-4">
      <div>
        <p class="text-xs font-black tracking-[2px] uppercase text-black/60 mb-2">Ordre soumis</p>
        <div class="flex flex-col gap-2">
          @for (item of submittedOrder(); track item._id; let i = $index) {
            <div
              class="neo-card p-2 flex items-center gap-2 border-[2px]"
              [class.border-red-500]="!isCorrectPosition(i, item._id)"
              [class.border-black]="isCorrectPosition(i, item._id)">
              <div class="relative w-7 h-7 border border-black overflow-hidden shrink-0">
                <img [ngSrc]="item.file" fill alt="" class="object-cover" />
              </div>
              <span class="text-xs font-bold">{{ item.label }}</span>
            </div>
          }
        </div>
      </div>
      <div>
        <p class="text-xs font-black tracking-[2px] uppercase text-green-700 mb-2">Ordre correct</p>
        <div class="flex flex-col gap-2">
          @for (item of correctOrder(); track item._id) {
            <div class="neo-card p-2 flex items-center gap-2 border-[2px] border-green-500">
              <div class="relative w-7 h-7 border border-black overflow-hidden shrink-0">
                <img [ngSrc]="item.file" fill alt="" class="object-cover" />
              </div>
              <span class="text-xs font-bold">{{ item.label }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
})
export class OrderReviewComponent {
  readonly question = input.required<IOrderQuestion>();
  readonly responseJson = input.required<string>();

  readonly submittedOrder = computed<IOrderItem[]>(() => {
    try {
      const ids: string[] = JSON.parse(this.responseJson());
      const itemMap = new Map(this.question().orderItems.map((i) => [i._id, i]));
      return ids.map((id) => itemMap.get(id)).filter(Boolean) as IOrderItem[];
    } catch {
      return [];
    }
  });

  readonly correctOrder = computed<IOrderItem[]>(() => {
    const itemMap = new Map(this.question().orderItems.map((i) => [i._id, i]));
    return this.question().answer.map((id) => itemMap.get(id)).filter(Boolean) as IOrderItem[];
  });

  isCorrectPosition(index: number, itemId: string): boolean {
    return this.question().answer[index] === itemId;
  }
}
```

---

## Task 11 : Frontend — mettre à jour PlayersAnswersComponent

**Files:**
- Modify: `apps/keyrigme-front/src/app/players-answers/players-answers.component.ts`

Pour les questions Order, afficher `app-order-review` à la place du paragraphe texte de réponse.

- [ ] **Modifier `players-answers.component.ts`**

```typescript
// apps/keyrigme-front/src/app/players-answers/players-answers.component.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { AnswerStepperComponent } from './answer-stepper/answer-stepper.component';
import { CdkStep } from '@angular/cdk/stepper';
import { startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { QuestionComponent } from '../shared/components/question/question.component';
import { QuizzStore } from '../store/quizz/quizz.store';
import { Dispatcher } from '@ngrx/signals/events';
import { quizzEvents } from '../store/quizz/quizz.event';
import { isOrderQuestion, IOrderQuestion } from '@keyrigme/keyrigme-models';
import { OrderReviewComponent } from './order-review.component';

@Component({
  template: `
    @if (room(); as roomValue) {
      @let isOwnerValue = isOwner();
      <app-answer-stepper
        #stepper
        [selectedIndex]="playerAnswerIndex()"
        [roomId]="roomValue._id"
        [isOwner]="!!isOwnerValue">
        @for (question of questions(); track question._id; let lastQuestion = $last) {
          @for (player of players(); track player.socketId; let lastPlayer = $last) {
            <cdk-step>
              <app-question [question]="question">
                <ng-container question-header>
                  <div class="flex items-center gap-3 w-full px-4 pt-4">
                    <div class="flex-1 h-3 bg-white border-[2px] border-black overflow-hidden"
                      role="progressbar"
                      [attr.aria-valuenow]="((stepper.selectedIndex + 1) / responseCount()) * 100"
                      aria-valuemin="0" aria-valuemax="100">
                      <div class="h-full bg-yellow transition-all duration-300"
                        [style.width.%]="((stepper.selectedIndex + 1) / responseCount()) * 100"></div>
                    </div>
                    <span class="neo-badge shrink-0">{{ stepper.selectedIndex + 1 }}/{{ responseCount() }}</span>
                  </div>
                </ng-container>
                <ng-container question-footer>
                  @if (answers(); as usersAnswers) {
                    @let currentAnswer = usersAnswers[question._id][player.socketId];
                    <div class="px-4 pb-6 flex flex-col gap-3">
                      <p class="text-xs font-black tracking-[2px] uppercase text-black/60 px-1">{{ player.username }}</p>
                      @if (isOrderQuestion(question)) {
                        <app-order-review
                          [question]="asOrder(question)"
                          [responseJson]="currentAnswer.response" />
                      } @else {
                        <div class="neo-card p-4">
                          <p class="text-lg font-black">{{ currentAnswer.response }}</p>
                        </div>
                      }
                      @if (isOwnerValue) {
                        <button type="button" class="neo-btn px-4 py-2 text-xs transition-colors self-end"
                          [class]="currentAnswer.point > 0
                            ? 'bg-green-valid text-white border-[2px] border-black shadow-[2px_2px_0_#000]'
                            : 'bg-white text-black border-[2px] border-black shadow-[2px_2px_0_#000]'"
                          [attr.aria-pressed]="currentAnswer.point > 0"
                          (click)="updateValidityAnswer(question._id, player.socketId, question.point, currentAnswer.point)">
                          {{ currentAnswer.point > 0 ? '✓ ' + question.point + ' pts' : '✗ 0 pt' }}
                        </button>
                      }
                      @if (lastQuestion && lastPlayer && isOwnerValue) {
                        <button type="button" class="neo-btn-black w-full py-3 text-sm" (click)="setUserPoints()">
                          Voir les résultats
                        </button>
                      }
                    </div>
                  }
                </ng-container>
              </app-question>
            </cdk-step>
          }
        }
      </app-answer-stepper>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AnswerStepperComponent, CdkStep, QuestionComponent, OrderReviewComponent],
})
export default class AnswersVerificationComponent {
  private readonly quizzStore = inject(QuizzStore);
  readonly dispatcher = inject(Dispatcher);
  private readonly quizzSocketService = inject(QuizzSocketService);

  readonly room = this.quizzStore.room;
  readonly questions = this.quizzStore.questions;
  readonly players = this.quizzStore.players;
  readonly answers = this.quizzStore.answers;
  readonly isOwner = this.quizzStore.isOwner;

  readonly responseCount = computed(
    () => this.questions().length * this.players().length
  );

  private readonly playerAnswerIndex$ = this.quizzSocketService
    .onIndexAnswersChange()
    .pipe(startWith(0));

  readonly playerAnswerIndex = toSignal(this.playerAnswerIndex$, {
    requireSync: true,
  });

  readonly isOrderQuestion = isOrderQuestion;

  asOrder(q: unknown): IOrderQuestion {
    return q as IOrderQuestion;
  }

  updateValidityAnswer(
    questionId: string,
    socketId: string,
    questionPoint: number,
    currentPoint: number
  ) {
    const point = currentPoint === 0 ? questionPoint : 0;
    this.dispatcher.dispatch(
      quizzEvents.updateValidityAnswer({ questionId, socketId, point })
    );
  }

  setUserPoints() {
    const answers = this.answers();
    const room = this.room();
    if (room && answers) {
      this.quizzSocketService.setUserPoints(room._id, answers);
    }
  }
}
```

- [ ] **Builder final**

```bash
pnpm nx build keyrigme-front
```

Expected: BUILD SUCCESS sans erreurs.

- [ ] **Commit final**

```bash
git add apps/keyrigme-front/src/app/players-answers/
git commit -m "feat(front): order question review screen with side-by-side comparison"
```

---

## Vérification manuelle

Après les 11 tasks, lancer l'app et vérifier :

1. **Question Media mono-image** : une image s'affiche dans la grille 1×1
2. **Question Media multi-images** : images en grille 2×N
3. **Question Media audio** : bouton play/pause, barre de progression
4. **Question Order** : cartes shufflées au chargement, drag & drop fonctionnel, `orderedIds` émis
5. **Correction Order** : côte à côte soumis (rouge si mal placé) vs correct (vert), bouton toggle ✓/✗

```bash
pnpm nx serve keyrigme-front
pnpm nx serve keyrigme-back
```
