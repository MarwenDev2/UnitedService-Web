import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemandeAvance } from './demande-avance';

describe('DemandeAvance', () => {
  let component: DemandeAvance;
  let fixture: ComponentFixture<DemandeAvance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemandeAvance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemandeAvance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
