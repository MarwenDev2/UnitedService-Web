import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CongesManagement } from './conges-management';

describe('CongesManagement', () => {
  let component: CongesManagement;
  let fixture: ComponentFixture<CongesManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CongesManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CongesManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
