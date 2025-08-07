import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WorkerService } from '../../core/services/worker.service';
import { Worker } from '../../models/Worker.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-add-worker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-worker.component.html',
  styleUrls: ['./add-worker.component.scss']
})
export class AddWorkerComponent implements OnInit {
  workerForm!: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  private fb = inject(FormBuilder);
  private workerService = inject(WorkerService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.workerForm = this.fb.group({
      name: ['', Validators.required],
      cin: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      department: ['', Validators.required],
      position: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      salary: [null, [Validators.required, Validators.min(0)]],
      gender: ['Homme', Validators.required],
      dateOfBirth: [null, [Validators.required, this.ageValidator(14)]],
      address: ['', Validators.required],
      totalCongeDays: [30, [Validators.required, Validators.min(0)]],
    });
  }

  ageValidator(minAge: number): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate if empty
      }
      const birthDate = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= minAge ? null : { invalidAge: `L'employé doit avoir au moins ${minAge} ans` };
    };
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.workerForm.invalid) {
      this.workerForm.markAllAsTouched();
      this.notificationService.showError('Veuillez remplir tous les champs obligatoires correctement.');
      return;
    }

    const formValue = this.workerForm.value;
    const newWorker: Partial<Worker> = {
      ...formValue,
      status: 'actif',
      creationDate: new Date(),
      usedCongeDays: 0,
      profileImagePath: '', // Will be updated after upload if a file is selected
    };

    this.workerService.createWorker(newWorker as Worker).subscribe({
      next: (createdWorker) => {
        this.notificationService.showSuccess('Employé ajouté avec succès!');
        if (this.selectedFile) {
          this.workerService.uploadWorkerPhoto(createdWorker.id, this.selectedFile).subscribe({
            next: (updatedWorker) => {
              this.notificationService.showSuccess('Image de profil téléchargée.');
              this.router.navigate(['/workers-list']);
            },
            error: (err) => {
              console.error('Image upload failed', err);
              this.notificationService.showError("L'image n'a pas pu être téléchargée.");
              this.router.navigate(['/workers-list']);
            }
          });
        } else {
          this.router.navigate(['/workers-list']);
        }
      },
      error: (err) => {
        console.error('Worker creation failed', err);
        this.notificationService.showError("Erreur lors de la création de l'employé.");
      }
    });
  }
}