import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CfCard } from './circle-progress-bar.component';

describe('CfCard', () => {
  let component: CfCard;
  let fixture: ComponentFixture<CfCard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CfCard]
    });
    fixture = TestBed.createComponent(CfCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
