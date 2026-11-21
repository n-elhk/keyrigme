import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CfAvatar } from './avatar.component';

describe('CfAvatar', () => {
  let component: CfAvatar;
  let fixture: ComponentFixture<CfAvatar>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CfAvatar],
    });
    fixture = TestBed.createComponent(CfAvatar);
    fixture.componentRef.setInput('src', 'avatar.png');
    fixture.componentRef.setInput('width', 40);
    fixture.componentRef.setInput('height', 40);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
