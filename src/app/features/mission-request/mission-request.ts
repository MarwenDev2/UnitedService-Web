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
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  selector: 'app-mission-request',
  templateUrl: './mission-request.html',
  styleUrls: ['./mission-request.scss']
})
export class MissionRequest implements OnInit {
  missionForm: FormGroup;
  selectedWorkers: Worker[] = [];
  workerLabel: string = '';
  isFormVisible: boolean = true;

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
      missionDate: [{ value: '', disabled: true }, Validators.required],
      endDate: [{ value: '', disabled: true }, Validators.required],
    });
  }

  ngOnInit() {
    this.checkWorkers();
  }

  checkWorkers() {
    const workerIds = this.missionService.getSelectedWorkers();
    if (!workerIds || workerIds.length === 0) {
      this.openCinPopup();
    } else {
      this.loadWorkers(workerIds);
    }
  }

  loadWorkers(ids: number[]) {
    this.selectedWorkers = [];
    ids.forEach(id => {
      this.workerService.getWorkerById(id).subscribe(worker => {
        if (worker) {
          this.selectedWorkers.push(worker);
          this.updateLabel();
          this.enableForm();
        }
      });
    });
  }

  updateLabel() {
    if (this.selectedWorkers.length === 1) {
      const w = this.selectedWorkers[0];
      const civilite = w.gender.toLowerCase() === 'homme' ? 'Mr' : 'Mme';
      this.workerLabel = `Demande d'ordre de mission pour ${civilite} ${w.name}`;
    } else if (this.selectedWorkers.length > 1) {
      this.workerLabel = `Demande d'ordre de mission pour ${this.selectedWorkers.length} employés`;
    }
  }

  openCinPopup() {
    const dialogRef = this.dialog.open(CinPopup, { width: '400px' });
  
    dialogRef.afterClosed().subscribe((worker: Worker) => {
      if (worker) {
        const alreadyExists = this.selectedWorkers.some(w => w.cin === worker.cin);
        if (alreadyExists) {
          this.notificationService.showWarning(
            `⚠️ L'employé avec le CIN ${worker.cin} est déjà ajouté.`
          );
          return; // Do not add duplicate
        }
  
        this.selectedWorkers.push(worker);
        this.missionService.setSelectedWorkers(this.selectedWorkers.map(w => w.id));
        this.updateLabel();
        this.enableForm();
      }
    });
  }
  

  addWorkerByCin() {
    this.openCinPopup();
  }

  enableForm() {
    this.missionForm.get('destination')?.enable();
    this.missionForm.get('missionDate')?.enable();
    this.missionForm.get('endDate')?.enable();
  }

  disableForm() {
    this.missionForm.get('destination')?.disable();
    this.missionForm.get('missionDate')?.disable();
    this.missionForm.get('endDate')?.disable();
  }

  onSubmit() {
    if (this.missionForm.valid && this.selectedWorkers.length > 0) {
      const mission = {
        workerIds: this.selectedWorkers.map(w => w.id),
        destination: this.missionForm.value.destination,
        missionDate: this.missionForm.value.missionDate.toISOString().split('T')[0],
        endDate: this.missionForm.value.endDate.toISOString().split('T')[0],
      };

      this.missionService.createMission(
        mission.workerIds,
        mission.destination,
        mission.missionDate,
        mission.endDate
      ).subscribe({
        next: () => {
          this.notificationService.showSuccess('✅ Demande envoyée avec succès !');
          this.router.navigate(['/missions']);
        },
        error: (err) => {
          this.notificationService.showError('❌ Erreur lors de l\'envoi de la demande');
          console.error(err);
        }
      });
    }
  }

  removeWorker(index: number) {
    this.selectedWorkers.splice(index, 1);
    this.missionService.setSelectedWorkers(this.selectedWorkers.map(w => w.id));
    this.updateLabel();
    if (this.selectedWorkers.length === 0) {
      this.disableForm();
    }
  }

  resetCin() {
    this.missionService.setSelectedWorkers([]);
    this.selectedWorkers = [];
    this.workerLabel = '';
    this.disableForm();
    this.missionForm.reset({
      destination: { value: '', disabled: true },
      missionDate: { value: '', disabled: true },
      endDate: { value: '', disabled: true }
    });
    this.openCinPopup();
  }
}
