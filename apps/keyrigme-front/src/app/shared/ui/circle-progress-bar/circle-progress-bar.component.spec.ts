import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircleProgressBarComponent } from './circle-progress-bar.component';

describe('CircleProgressBarComponent', () => {
  let component: CircleProgressBarComponent;
  let fixture: ComponentFixture<CircleProgressBarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CircleProgressBarComponent]
    });
    fixture = TestBed.createComponent(CircleProgressBarComponent);
    fixture.componentRef.setInput('percent', 50);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
