import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CinPopup } from './cin-popup';

describe('CinPopup', () => {
  let component: CinPopup;
  let fixture: ComponentFixture<CinPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CinPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CinPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
