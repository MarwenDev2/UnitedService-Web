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
    private snackBar: MatSnackBar
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

    dialogRef.afterClosed().subscribe(result => {
      const worker = this.demandeService.getSelectedWorker();
      if (result && worker) {
        this.setWorkerLabel(worker);
        this.enableForm();
        this.isWorkerSelected = true;
      } else {
        this.workerName = ''; // No worker name if canceled
        this.disableForm(); // Disable form if no worker selected
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
    if (this.demandeForm.valid && this.isWorkerSelected) {
      const demande = this.demandeForm.value;
      const file = this.demandeForm.get('attachment')?.value;
      this.demandeService.createDemande(demande, file).subscribe({
        next: () => {
          this.snackBar.open('✅ Demande envoyée avec succès !', 'Fermer', { duration: 3000 });
          this.demandeForm.reset();
          this.demandeForm.get('attachment')?.setValue(null);
        },
        error: (err) => this.snackBar.open(`❌ ${err.error?.message || 'Une erreur est survenue.'}`, 'Fermer', { duration: 3000 })
      });
    }
  }

  resetCin() {
    this.demandeService.setSelectedWorker(0);
    this.workerName = '';
    this.disableForm();
    this.isWorkerSelected = false;
    this.demandeForm.reset();
    this.demandeForm.get('attachment')?.setValue(null);
    this.openCinPopup(); // Re-open CIN prompt
  }
}