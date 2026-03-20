import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CfAvatar } from './avatar.component';

describe('CfCard', () => {
  let component: CfAvatar;
  let fixture: ComponentFixture<CfAvatar>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CfAvatar],
    });
    fixture = TestBed.createComponent(CfAvatar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
