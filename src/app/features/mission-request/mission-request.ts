import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { MissionRequestService } from '../../core/services/mission-request.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { CinPopup } from '../cin-popup/cin-popup';
import { WorkerService } from '../../core/services/worker.service';
import { Worker } from '../../models/Worker.model';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  selector: 'app-mission-request',
  templateUrl: './mission-request.html',
  styleUrls: ['./mission-request.scss']
})
export class MissionRequest implements OnInit {
  missionForm: FormGroup;
  workerName: string = '';
  isFormVisible: boolean = true;
  isWorkerSelected: boolean = false;
  worker: Worker | null = null;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private missionService: MissionRequestService,
    private workerService: WorkerService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.missionForm = this.fb.group({
      destination: [{ value: '', disabled: true }, Validators.required],
      missionDate: [{ value: '', disabled: true }, Validators.required]
    });
  }

  ngOnInit() {
    this.checkWorker();
  }

  checkWorker() {
    const workerId = this.missionService.getSelectedWorker();
    if (!workerId) {
      this.openCinPopup();
    } else {
      this.workerService.getWorkerById(workerId).subscribe(worker => {
        if (worker) {
          this.worker = worker;
          const civilite = this.worker.gender.toLowerCase() === 'homme' ? 'Mr' : 'Mme';
          this.workerName = `Demande d'ordre de mission pour ${civilite} ${this.worker.name}`;
          this.enableForm();
          this.isWorkerSelected = true;
        } else {
          this.openCinPopup();
        }
      });
    }
  }

  openCinPopup() {
    const dialogRef = this.dialog.open(CinPopup, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe((worker: Worker) => {
      if (worker) {
        this.missionService.setSelectedWorker(worker.id);
        this.worker = worker;
        const civilite = this.worker.gender.toLowerCase() === 'homme' ? 'Mr' : 'Mme';
        this.workerName = `Demande d'ordre de mission pour ${civilite} ${this.worker.name}`;
        this.enableForm();
        this.isWorkerSelected = true;
      } else {
        // If the popup is closed without a worker, we don't do anything
        // This might need a different logic depending on the app's requirements
      }
    });
  }

  setWorkerLabel(workerId: number) {
    this.workerService.getWorkerById(workerId).subscribe({
      next: (worker) => {
        this.worker = worker;
        const civilite = this.worker.gender.toLowerCase() === 'homme' ? 'Mr' : 'Mme';
        this.workerName = `Demande d'ordre de mission pour ${civilite} ${this.worker.name}`;
      },
      error: (err) => {
        this.workerName = 'Could not load worker information.';
        console.error(err);
      }
    });
  }

  enableForm() {
    this.missionForm.get('destination')?.enable();
    this.missionForm.get('missionDate')?.enable();
  }

  disableForm() {
    this.missionForm.get('destination')?.disable();
    this.missionForm.get('missionDate')?.disable();
  }

  onSubmit() {
    if (this.missionForm.valid && this.isWorkerSelected) {
      const workerId = this.missionService.getSelectedWorker();
      if (workerId) {
        const mission = {
          workerId,
          destination: this.missionForm.value.destination,
          missionDate: this.missionForm.value.missionDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
        };
        this.missionService.createMission(this.worker!.id, mission.destination, mission.missionDate).subscribe({
          next: () => {
            this.notificationService.showSuccess('✅ Demande envoyée avec succès !');
            this.router.navigate(['/missions-management']); // Redirect on success
          },
          error: (err) => {
            this.notificationService.showError('❌ Erreur lors de l\'envoi de la demande');
            console.error(err);
          }
        });
      }
    }
  }

  resetCin() {
    this.missionService.setSelectedWorker(0);
    this.worker = null;
    this.workerName = '';
    this.disableForm();
    this.isWorkerSelected = false;
    this.missionForm.reset({
      destination: { value: '', disabled: true },
      missionDate: { value: '', disabled: true }
    });
    this.openCinPopup();
  }
}