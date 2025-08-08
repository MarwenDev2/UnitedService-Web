import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { WorkerService } from '../../core/services/worker.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-cin-popup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './cin-popup.html',
  styleUrls: ['./cin-popup.scss']
})
export class CinPopup {
  cinForm: FormGroup;
  isLoading: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<CinPopup>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private workerService: WorkerService,
    
  ) {
    this.cinForm = this.fb.group({
      cin: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{8}$/)]]
    });
  }

  onSubmit() {
    if (this.cinForm.valid) {
            this.isLoading = true;
      this.cinForm.get('cin')?.disable(); // Disable the form control
      const cin = this.cinForm.get('cin')?.value;
      this.workerService.getWorkerByCin(cin).subscribe({
        next: (worker) => {
          this.isLoading = false;
          this.cinForm.get('cin')?.enable(); // Re-enable on completion
          if (worker) {
            this.dialogRef.close(worker); // Pass the entire worker object back
          } else {
            this.cinForm.get('cin')?.setErrors({ workerNotFound: true });
          }
        },
        error: () => {
          this.isLoading = false;
          this.cinForm.get('cin')?.enable(); // Re-enable on error
          this.cinForm.get('cin')?.setErrors({ workerNotFound: true });
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close(); // Close without a result
  }
}
