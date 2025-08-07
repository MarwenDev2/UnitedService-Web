import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminStatistics } from './admin-statistics';

describe('AdminStatistics', () => {
  let component: AdminStatistics;
  let fixture: ComponentFixture<AdminStatistics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminStatistics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminStatistics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
