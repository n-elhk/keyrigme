import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { QuizzStore } from '../store/quizz/quizz.store';
import { CfAvatar } from "../shared/ui/avatar";

@Component({
  templateUrl: './result.component.html',
  styleUrl: './result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, CfAvatar],
})
export default class ResultComponent {
  private readonly quizzStore = inject(QuizzStore);
  readonly playersPoint = this.quizzStore.playersPoint;
  readonly results = computed(() => this.quizzStore.playersPoint().sort((a, b) => b.point - a.point));

  readonly displayedColumns: string[] = ['position', 'avatar', 'username', 'point'];
  readonly data = [
    { position: 1, avatar: 'images/avatar/jesus.png', username: 'John', point: 50 },
    { position: 2, avatar: 'images/avatar/jesus.png', username: 'Jane', point: 70 },
    { position: 3, avatar: 'images/avatar/jesus.png', username: 'Bob', point: 30 },
    { position: 4, avatar: 'images/avatar/jesus.png', username: 'Bob', point: 30 },
    { position: 5, avatar: 'images/avatar/jesus.png', username: 'Alice', point: 80 },
    { position: 6, avatar: 'images/avatar/jesus.png', username: 'Charlie', point: 40 },
  ];
}
