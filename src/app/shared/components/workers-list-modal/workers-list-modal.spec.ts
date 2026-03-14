import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkersListModal } from './workers-list-modal';

describe('WorkersListModal', () => {
  let component: WorkersListModal;
  let fixture: ComponentFixture<WorkersListModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkersListModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkersListModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
