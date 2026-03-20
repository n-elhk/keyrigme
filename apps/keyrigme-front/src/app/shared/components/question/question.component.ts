
import { NgOptimizedImage } from '@angular/common';
import { Component, input, } from '@angular/core';
import { IQuestion } from '@keyrigme/keyrigme-models';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrl: './question.component.scss',
  imports: [NgOptimizedImage]
})
export class QuestionComponent {
readonly question = input.required<IQuestion>()
}
