import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionRequest } from './mission-request';

describe('MissionRequest', () => {
  let component: MissionRequest;
  let fixture: ComponentFixture<MissionRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissionRequest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
