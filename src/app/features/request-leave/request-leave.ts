import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CinPopup } from '../cin-popup/cin-popup';
import { CongeService } from '../../core/services/conge.service';
import { TypeConge } from '../../models/TypeConge.enum';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { Status } from '../../models/Status.enum';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule
  ],
  selector: 'app-request-leave',
  templateUrl: './request-leave.html',
  styleUrls: ['./request-leave.scss']
})
export class RequestLeave implements OnInit {
  demandeForm: FormGroup;
  workerName: string = '';
  isFormVisible: boolean = true; // Always visible, but controlled by worker selection
  typesConge = Object.values(TypeConge);
  isWorkerSelected: boolean = false;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private demandeService: CongeService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.demandeForm = this.fb.group({
      type: [{ value: '', disabled: true }, Validators.required],
      startDate: [{ value: '', disabled: true }, Validators.required],
      endDate: [{ value: '', disabled: true }, Validators.required],
      reason: [{ value: '', disabled: true }, Validators.required],
      attachment: [null]
    });
  }

  ngOnInit() {
    this.checkWorker();
  }

  checkWorker() {
    const worker = this.demandeService.getSelectedWorker();
    if (!worker) {
      this.openCinPopup();
    } else {
      this.setWorkerLabel(worker);
      this.enableForm();
      this.isWorkerSelected = true;
    }
  }

  openCinPopup() {
    const dialogRef = this.dialog.open(CinPopup, {
      width: '400px', // Increased width for better appearance
      data: {}
    });

    dialogRef.afterClosed().subscribe(worker => {
      if (worker) {
        this.demandeService.setSelectedWorker(worker);
        this.setWorkerLabel(worker);
        this.enableForm();
        this.isWorkerSelected = true;
      } else {
        this.workerName = '';
        this.disableForm();
        this.isWorkerSelected = false;
      }
    });
  }

  setWorkerLabel(worker: any) {
    const civilite = worker.gender.toLowerCase() === 'homme' ? 'Mr' : 'Mme';
    this.workerName = `Demande de congé pour ${civilite} ${worker.name}`;
  }

  enableForm() {
    this.demandeForm.get('type')?.enable();
    this.demandeForm.get('startDate')?.enable();
    this.demandeForm.get('endDate')?.enable();
    this.demandeForm.get('reason')?.enable();
  }

  disableForm() {
    this.demandeForm.get('type')?.disable();
    this.demandeForm.get('startDate')?.disable();
    this.demandeForm.get('endDate')?.disable();
    this.demandeForm.get('reason')?.disable();
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    this.demandeForm.get('attachment')?.setValue(file);
  }

  onSubmit() {
    if (!this.demandeForm.valid || !this.isWorkerSelected) {
      this.notificationService.showWarning('Veuillez remplir tous les champs requis.', 'Action non autorisée');
      return;
    }
  
    const worker = this.demandeService.getSelectedWorker();
    if (!worker) {
      this.notificationService.showWarning('Erreur: Travailleur non identifié.', 'Action non autorisée');
      return;
    }
  
    const { startDate, endDate } = this.demandeForm.value;
  
    if (new Date(endDate) < new Date(startDate)) {
      this.notificationService.showWarning('La date de fin doit être postérieure à la date de début.', 'Action non autorisée');
      return;
    }
  
    if (new Date(startDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
      this.notificationService.showWarning('La date de début ne peut pas être dans le passé.', 'Action non autorisée');
      return;
    }
    const startDateStr = this.demandeForm.value.startDate.toISOString().split('T')[0];
    const endDateStr = this.demandeForm.value.endDate.toISOString().split('T')[0];
    
    // ✅ Use backend check-eligibility
    this.demandeService.checkEligibility(worker.id, startDateStr, endDateStr).subscribe({
      next: (res) => {
        if (res === 'OK') {
          const demande = this.demandeForm.value;
          const file = this.demandeForm.get('attachment')?.value;
          this.demandeService.createDemande(demande, file).subscribe({
            next: () => {
              this.notificationService.showSuccess('✅ Demande envoyée avec succès !', 'Fermer');
              this.router.navigate(['/conges']);
            },
            error: (err) => this.notificationService.showError(`❌ ${err.error?.message || 'Une erreur est survenue.'}`, 'Fermer')
          });
        } else {
          this.notificationService.showWarning(res, 'Action non autorisée');
        }
      },
      error: (err) => {
        this.notificationService.showError(`❌ ${err.error}`, 'Fermer');
      }
    });
  }
  
  

  resetCin() {
    this.demandeService.setSelectedWorker(null);
    this.workerName = '';
    this.disableForm();
    this.isWorkerSelected = false;
    this.demandeForm.reset();
    this.demandeForm.get('attachment')?.setValue(null);
    this.openCinPopup(); // Re-open CIN prompt
  }
}