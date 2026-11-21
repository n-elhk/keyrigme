import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnswerStepperComponent } from './answer-stepper.component';
import { QuizzRpcService } from '../../shared/services/quizz-rpc.service';

describe('AnswerStepperComponent', () => {
  let component: AnswerStepperComponent;
  let fixture: ComponentFixture<AnswerStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerStepperComponent],
      providers: [{ provide: QuizzRpcService, useValue: { indexAnswersChange: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(AnswerStepperComponent);
    fixture.componentRef.setInput('roomId', 'room-1');
    fixture.componentRef.setInput('isOwner', false);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
