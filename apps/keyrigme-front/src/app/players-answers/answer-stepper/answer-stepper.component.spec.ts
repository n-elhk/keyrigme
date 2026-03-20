import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnswerStepperComponent } from './answer-stepper.component';

describe('AnswerStepperComponent', () => {
  let component: AnswerStepperComponent;
  let fixture: ComponentFixture<AnswerStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnswerStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
