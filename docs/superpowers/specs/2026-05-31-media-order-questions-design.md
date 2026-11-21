# Design — Questions Media multi-fichiers & Questions Order

**Date :** 2026-05-31  
**Statut :** Approuvé

---

## Contexte

Le système de quiz supporte actuellement un seul type de question (`Media`) avec un fichier unique (`file: string`) et une réponse texte validée manuellement par l'admin. Les constantes `QuestionTypes.Order` et `QuestionTypes.Text` existent déjà mais ne sont pas implémentées. Le schéma Mongoose a un champ `files: string[]` mais il est absent de l'interface TypeScript partagée.

L'objectif est d'implémenter :
1. **Media multi-fichiers** : questions avec une ou plusieurs images (grille) ou sons
2. **Order** : questions où le joueur ordonne des cartes image + label via drag & drop

---

## Décisions clés

| Sujet | Décision |
|---|---|
| Architecture données | Discriminateurs Mongoose (option C) |
| Affichage multi-images | Grille 2×N (tout visible) |
| Affichage audio | Lecteur custom avec `<audio>` natif |
| Interface ordering | Drag & drop via Angular CDK (déjà installé) |
| Correction Order | Manuelle par l'admin (comme aujourd'hui) |
| Bouton correction | Un seul bouton toggle ✗/✓ (inchangé) |
| Admin question creation | Hors scope |

---

## Modèle de données

### `libs/keyrigme-models` — interfaces TypeScript

```typescript
// types/question.type.ts

export interface IBaseQuestion {
  _id: string
  title: string
  point: number
  timer: number
  categories: QuestionCategoriesValues[]
  type: QuestionTypesValues
  createdAt: string
  updatedAt: string
}

export interface IMediaQuestion extends IBaseQuestion {
  type: 'Media'
  mediaType: MediaTypesValues  // 'Image' | 'Audio'
  files: string[]              // remplace l'ancien file: string
  answer: string
}

export interface IOrderItem {
  _id: string
  label: string
  file: string
}

export interface IOrderQuestion extends IBaseQuestion {
  type: 'Order'
  orderItems: IOrderItem[]
  answer: string[]             // ordre correct (tableau d'_id de IOrderItem)
}

export interface ITextQuestion extends IBaseQuestion {
  type: 'Text'
  answer: string
}

export type IQuestion = IMediaQuestion | IOrderQuestion | ITextQuestion
```

Les types guards TypeScript (`isMediaQuestion`, `isOrderQuestion`) seront définis dans `libs/keyrigme-models` pour le narrowing côté frontend et backend.

`QuestionWithoutId` (utilisé dans `QuestionService.insertMany` et le seed) devient une union : `IMediaQuestion | IOrderQuestion | ITextQuestion` sans `_id`.

### Backend — Mongoose discriminateurs

**`question.schema.ts`** (base) :
```typescript
@Schema({ discriminatorKey: 'type' })
class Question {
  title, point, timer, categories, type, createdAt, updatedAt
}
```

**`media-question.schema.ts`** :
```typescript
@Schema()
class MediaQuestion extends Question {
  @Prop({ type: [String], default: [] }) files: string[]
  @Prop({ type: String, enum: Object.values(MediaTypes) }) mediaType: MediaTypesValues
  @Prop({ type: String, required: true }) answer: string
}
```

**`order-question.schema.ts`** :
```typescript
// Sous-schéma explicite requis pour que Mongoose génère des _id sur chaque item
const OrderItemSchema = new Schema({ label: String, file: String })

@Schema()
class OrderQuestion extends Question {
  @Prop({ type: [OrderItemSchema] }) orderItems: IOrderItem[]
  @Prop({ type: [String] }) answer: string[]  // ordre correct
}
```

### Migration

Les 15 questions existantes ont toutes `type: 'Media'` → le discriminateur `MediaQuestion` les capture automatiquement. Le champ `file: string` est remplacé par `files: string[]` dans le seed. Re-seeder suffit.

---

## UX joueur — pendant la partie

### Question Media (images)
- Titre de la question (style actuel `neo-card`)
- Grille 2 colonnes d'images (`files[]`), chaque image avec `NgOptimizedImage`
- Champ texte réponse (inchangé)

### Question Media (audio)
- Titre de la question
- Pour chaque fichier dans `files[]` : un lecteur audio custom (`<audio>` natif, bouton play/pause, barre de progression, durée)
- Un seul extrait → lecteur centré ; plusieurs extraits → liste de lecteurs numérotés
- Champ texte réponse (inchangé)

### Question Order
- Titre de la question
- Instruction "Glisse les cartes pour les ordonner"
- Liste verticale de cartes draggables (`CdkDragDrop`) : chaque carte = icône drag + image (`file`) + label
- Pas de champ texte — la réponse est l'ordre des cartes
- Soumission : tableau d'`_id` (`IOrderItem._id`) dans l'ordre choisi, sérialisé en JSON dans le champ `response` du socket existant

---

## UX admin — écran de correction

### Questions Media (inchangé)
Réponse texte du joueur + bouton toggle ✗/✓.

### Questions Order
- Affichage côte à côte :
  - **Gauche** : ordre soumis par le joueur (cartes image+label, items mal placés mis en évidence en rouge)
  - **Droite** : ordre correct (cartes en vert)
- Bouton toggle unique ✗/✓ (même comportement qu'aujourd'hui)
- La comparaison est affichée pour info uniquement — c'est l'admin qui décide

---

## Composants Angular à créer / modifier

| Fichier | Action |
|---|---|
| `question.component.ts` | Modifier : dispatcher vers sous-composant selon `question.type` |
| `media-question.component.ts` | Créer : grille images ou liste lecteurs audio |
| `order-question.component.ts` | Créer : liste CDK drag & drop |
| `order-review.component.ts` | Créer : vue côte à côte soumis vs correct |
| `players-answers.component.ts` | Modifier : passer le bon composant de review selon le type |
| `quizz.type.ts` (store) | Modifier : typage réponse Order (`string` → `string | string[]`) |

---

## Flux socket (inchangé)

Le message `PlayerAnswer` envoie `{ roomId, questionId, response: string }`. Pour les questions Order, `response` = JSON.stringify des `_id` dans l'ordre soumis. Aucun nouveau event socket nécessaire.

---

## Ce qui est hors scope

- Écran d'administration pour créer/modifier les questions
- Questions de type `Text` (interface définie mais non implémentée)
- Correction automatique des questions Order (partielle ou totale)
