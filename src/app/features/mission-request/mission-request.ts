import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    private snackBar: MatSnackBar
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
      this.setWorkerLabel(workerId);
      this.enableForm();
      this.isWorkerSelected = true;
    }
  }

  openCinPopup() {
    const dialogRef = this.dialog.open(CinPopup, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      const workerId = this.missionService.getSelectedWorker();
      if (result && workerId) {
        this.setWorkerLabel(workerId);
        this.enableForm();
        this.isWorkerSelected = true;
      } else {
        this.workerName = '';
        this.disableForm();
        this.isWorkerSelected = false;
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
        this.missionService.createMission(workerId, mission.destination, mission.missionDate).subscribe({
          next: () => {
            this.snackBar.open('✅ Demande envoyée avec succès !', 'Fermer', { duration: 3000 });
            this.missionForm.reset();
            this.disableForm();
            this.isWorkerSelected = false;
          },
          error: (err) => this.snackBar.open(`❌ ${err.error?.message || 'Une erreur est survenue.'}`, 'Fermer', { duration: 3000 })
        });
      }
    }
  }

  resetCin() {
    this.missionService.setSelectedWorker(0);
    this.workerName = '';
    this.disableForm();
    this.isWorkerSelected = false;
    this.missionForm.reset();
    this.openCinPopup();
  }
}