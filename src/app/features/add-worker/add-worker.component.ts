import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { WorkerService } from '../../core/services/worker.service';
import { Worker } from '../../models/Worker.model';
import { NotificationService } from '../../core/services/notification.service';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/plain'
];

// Helper function to create form group
function createWorkerForm(fb: FormBuilder): FormGroup {
  return fb.group({
    name: ['', Validators.required],
    cin: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    department: ['', Validators.required],
    position: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
    email: ['', [Validators.required, Validators.email]],
    salary: [null, [Validators.required, Validators.min(0)]],
    gender: ['Homme', Validators.required],
    dateOfBirth: [null, [Validators.required]],
    address: ['', Validators.required],
    totalCongeDays: [30, [Validators.required, Validators.min(0)]],
  });
}

// Custom validator for file type
function fileTypeValidator(allowedTypes: string[]) {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const file = control.value as File;
    return allowedTypes.includes(file.type) 
      ? null 
      : { invalidFileType: 'Type de fichier non supporté' };
  };
}

// Custom validator for file size
function fileSizeValidator(maxSize: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const file = control.value as File;
    return file.size <= maxSize 
      ? null 
      : { invalidFileSize: 'Fichier trop volumineux' };
  };
}

interface FilePreview {
  name: string;
  size: number;
  type: string;
  error?: string;
  progress?: number;
  uploading?: boolean;
}

@Component({
  selector: 'app-add-worker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FileSizePipe],
  templateUrl: './add-worker.component.html',
  styleUrls: ['./add-worker.component.scss']
})
export class AddWorkerComponent implements OnInit {
  workerForm!: FormGroup;
  selectedFile: File | null = null;
  selectedRelatedFiles: File[] = [];
  imagePreview: string | ArrayBuffer | null = null;
  filePreviews: FilePreview[] = [];
  isDraggingOver = false;
  maxDate: string = '';
  
  // Constants for template
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain'
  ];

  constructor(
    private fb: FormBuilder,
    private workerService: WorkerService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Set up the form
    this.workerForm = this.fb.group({
      name: ['', Validators.required],
      cin: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      department: ['', Validators.required],
      position: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      salary: [null, [Validators.required, Validators.min(0)]],
      gender: ['Homme', Validators.required],
      dateOfBirth: [null, {
        validators: [Validators.required, this.ageValidator(14)],
        updateOn: 'blur' // Validate when the field loses focus
      }],
      address: ['', Validators.required],
      totalCongeDays: [30, [Validators.required, Validators.min(0)]],
    });
    
    // Set max date for date picker (14 years ago from today)
    const today = new Date();
    const maxDateValue = new Date();
    maxDateValue.setFullYear(today.getFullYear() - 14);
    this.maxDate = maxDateValue.toISOString().split('T')[0];
    
    // Log form control changes for debugging
    this.workerForm.get('dateOfBirth')?.valueChanges.subscribe(value => {
      console.log('Date of birth value changed:', value);
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
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        this.notificationService.showError('Type de fichier non supporté pour la photo de profil');
        return;
      }
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        this.notificationService.showError('La photo de profil ne doit pas dépasser 5 Mo');
        return;
      }
      
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
      
      // Reset the input to allow selecting the same file again if needed
      input.value = '';
    }
  }

  onRelatedFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
      // Reset the input to allow selecting the same files again if needed
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
    
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  private processFiles(files: File[]): void {
    let hasInvalidFiles = false;
    
    files.forEach((file: File) => {
      // Skip if file is already in the list
      if (this.selectedRelatedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.notificationService.showWarning(`Le fichier "${file.name}" a déjà été ajouté`);
        return;
      }
      
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        this.filePreviews.push({
          name: file.name,
          size: file.size,
          type: file.type,
          error: 'Type non supporté'
        });
        hasInvalidFiles = true;
        return;
      }
      
      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        this.filePreviews.push({
          name: file.name,
          size: file.size,
          type: file.type,
          error: 'Trop volumineux (max 5 Mo)'
        });
        hasInvalidFiles = true;
        return;
      }
      
      // Add valid files to the list
      this.selectedRelatedFiles.push(file);
      this.filePreviews.push({
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        uploading: false
      });
    });
    
    if (hasInvalidFiles) {
      this.notificationService.showError('Certains fichiers n\'ont pas été ajoutés car ils sont invalides');
    } else if (files.length > 0) {
      this.notificationService.showSuccess(`${files.length} fichier(s) ajouté(s) avec succès`);
    }
  }

  getFileIcon(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'pdf':
        return 'fas fa-file-pdf';
      case 'doc':
      case 'docx':
        return 'fas fa-file-word';
      case 'xls':
      case 'xlsx':
        return 'fas fa-file-excel';
      case 'ppt':
      case 'pptx':
        return 'fas fa-file-powerpoint';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'fas fa-file-image';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'fas fa-file-audio';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'fas fa-file-video';
      case 'zip':
      case 'rar':
      case '7z':
        return 'fas fa-file-archive';
      case 'txt':
      case 'rtf':
        return 'fas fa-file-alt';
      case 'html':
      case 'css':
      case 'js':
      case 'ts':
        return 'fas fa-file-code';
      default:
        return 'fas fa-file';
    }
  }

  removeFile(index: number): void {
    // Remove the file from both arrays
    this.selectedRelatedFiles.splice(index, 1);
    this.filePreviews.splice(index, 1);
  }

  clearAllFiles(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer tous les fichiers ?')) {
      this.filePreviews = [];
      this.selectedRelatedFiles = [];
    }
  }

  getValidFilesCount(): number {
    return this.filePreviews.filter(file => !file.error).length;
  }

  hasInvalidFiles(): boolean {
    return this.filePreviews.some(file => !!file.error);
  }

  getFileTypesForDisplay(): string {
    const types = ALLOWED_FILE_TYPES.map(type => {
      switch (type) {
        case 'application/pdf': return 'PDF';
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return 'DOC, DOCX';
        case 'image/jpeg':
        case 'image/png':
          return 'JPG, PNG';
        case 'text/plain':
          return 'TXT';
        default:
          return type.split('/').pop()?.toUpperCase() || type;
      }
    });
    
    // Remove duplicates and join with comma
    return [...new Set(types)].join(', ');
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
      creationDate: new Date().toISOString().split('T')[0],
      usedCongeDays: 0,
      profileImagePath: '',
      relatedFilesPath: ''
    };

    this.workerService.createWorker(newWorker as Worker).subscribe({
      next: (createdWorker: Worker) => {
        const uploads: Observable<Worker>[] = [];
        
        // Upload profile photo if selected
        if (this.selectedFile) {
          uploads.push(
            this.workerService.uploadWorkerPhoto(createdWorker.id, this.selectedFile)
          );
        }
        
        // Upload related files if any
        if (this.selectedRelatedFiles.length > 0) {
          uploads.push(
            this.workerService.uploadRelatedFiles(createdWorker.id, this.selectedRelatedFiles)
          );
        }
        
        // Wait for all uploads to complete
        if (uploads.length > 0) {
          Promise.all(uploads.map(upload => upload.toPromise()))
            .then(() => {
              this.notificationService.showSuccess('Employé et fichiers ajoutés avec succès!');
              this.router.navigate(['/workers-list']);
            })
            .catch((err: any) => {
              console.error('Error uploading files', err);
              this.notificationService.showError('Erreur lors du téléchargement des fichiers, mais l\'employé a été créé.');
              this.router.navigate(['/workers-list']);
            });
        } else {
          this.notificationService.showSuccess('Employé ajouté avec succès!');
          this.router.navigate(['/workers-list']);
        }
      },
      error: (err: any) => {
        console.error('Error creating worker', err);
        this.notificationService.showError('Erreur lors de la création de l\'employé.');
      }
    });
  }
}