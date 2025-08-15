import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveHistoryModalComponent } from '../../shared/components/leave-history-modal/leave-history-modal.component';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, of, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Worker } from '../../models/Worker.model';
import { WorkerService } from '../../core/services/worker.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Role } from '../../models/Role.enum';
import { environment } from '../../../environments/environment';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-workers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LeaveHistoryModalComponent, ConfirmationModalComponent],
  templateUrl: './workers-list.html',
  styleUrls: ['./workers-list.scss']
})
export class WorkersListComponent implements OnInit {
  isLeaveHistoryVisible = false;
  selectedWorker: Worker | null = null;
  private workerService = inject(WorkerService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  // User Role
  isRH = false;
  isAdmin = false;

  // Confirmation Modal State
  isConfirmationModalVisible = false;
  modalConfig = { title: '', message: '', confirmButtonText: 'Confirm' };
  private workerToUpdate: Worker | null = null;
  workerToDelete: number | null = null;

  private workers$ = new BehaviorSubject<Worker[]>([]);
  filteredWorkers$: Observable<Worker[]> = of([]);
  workerPhotoUrls: Map<number, string> = new Map();
  loadingFiles: Map<number, boolean> = new Map();
  workerFiles: Map<number, string[]> = new Map();

  // Filters
  departments$: Observable<string[]> = of([]);
  public selectedDepartment = new BehaviorSubject<string>('Tous les départements');
  public searchTerm = new BehaviorSubject<string>('');

  // Stats
  public stats$ = new BehaviorSubject<{ total: number; active: number; onLeave: number }>({ total: 0, active: 0, onLeave: 0 });

  ngOnInit(): void {
    this.isRH = this.authService.currentUserValue?.role === Role.RH;
    this.isAdmin = this.authService.currentUserValue?.role === Role.ADMIN;
    this.loadInitialData();
    this.setupFiltering();
  }

  private loadInitialData(): void {
    this.workerService.getAllWorkers().subscribe(workers => {
      console.log('Workers loaded:', workers);
      this.workers$.next(workers);
      this.departments$ = of(['Tous les départements', ...[...new Set(workers.map(w => w.department))]]);
      // Load photo URLs for all workers
      workers.forEach(worker => {
        this.workerService.getWorkerPhotoUrl(worker.id).subscribe(url => {
          console.log(`Photo URL for ${worker.name}: ${url}`);
          this.workerPhotoUrls.set(worker.id, url);
        });
      });
    });
  }

  private setupFiltering(): void {
    this.filteredWorkers$ = combineLatest([
      this.workers$,
      this.selectedDepartment,
      this.searchTerm
    ]).pipe(
      map(([workers, department, term]) => {
        const filtered = workers
          .filter(w => department === 'Tous les départements' || w.department === department)
          .filter(w => term === '' || 
                       w.name.toLowerCase().includes(term.toLowerCase()) || 
                       w.position.toLowerCase().includes(term.toLowerCase()) || 
                       w.email.toLowerCase().includes(term.toLowerCase()));
        
        // Update stats based on filtered results
        this.updateStats(filtered);
        return filtered;
      })
    );
  }

  private updateStats(workers: Worker[]): void {
    const total = workers.length;
    const active = workers.filter(w => w.status.toLowerCase() === 'actif').length;
    const onLeave = workers.filter(w => w.usedCongeDays > 0).length;
    this.stats$.next({ total, active, onLeave });
  }

  getAvatar(worker: Worker): string {
    const photoPath = this.workerPhotoUrls.get(worker.id);
    if (photoPath) {
      // The path from backend is like "/Users/image.png", so we build the full URL.
      return `${environment.apiUrl}${photoPath}`;
    }

    // Fallback to default image
    const defaultImage = worker.gender.toLowerCase() === 'femme' 
      ? 'default-female.png' 
      : 'default-male.png';
    return `${environment.apiUrl}/Users/${defaultImage}`;
  }

  handleImageError(event: Event, worker: Worker): void {
    const imgElement = event.target as HTMLImageElement;
    const defaultUrl = worker.gender.toLowerCase() === 'femme' 
      ? `${environment.apiUrl}/Users/default-female.png` 
      : `${environment.apiUrl}/Users/default-male.png`;
    console.log('Image failed to load for', worker.name, ', falling back to:', defaultUrl);
    imgElement.src = defaultUrl;
  }

  openLeaveHistory(worker: Worker): void {
    this.selectedWorker = worker;
    this.isLeaveHistoryVisible = true;
  }

  closeLeaveHistory(): void {
    this.isLeaveHistoryVisible = false;
    this.selectedWorker = null;
  }

  // --- Status Change Logic ---

  promptChangeStatus(worker: Worker): void {
    if (!this.isRH) return;

    this.workerToUpdate = worker;
    const newStatus = worker.status === 'actif' ? 'inactif' : 'actif';
    const newStatusFrench = newStatus === 'actif' ? 'actif' : 'inactif';

    this.modalConfig = {
      title: 'Confirmation de changement de statut',
      message: `Êtes-vous sûr de vouloir changer le statut de ${worker.name} à "${newStatusFrench}" ?`,
      confirmButtonText: 'Confirmer',
    };

    this.isConfirmationModalVisible = true;
  }

  onStatusChangeConfirm(): void {
    if (!this.workerToUpdate) return;

    const worker = this.workerToUpdate;
    const newStatus = worker.status === 'actif' ? 'inactif' : 'actif';

    const updatedWorker = { ...worker, status: newStatus as 'actif' | 'inactif' };
    this.workerService.updateWorker(worker.id, updatedWorker).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Le statut de ${worker.name} a été mis à jour.`);
        this.loadInitialData(); // Reload data to reflect the change
      },
      error: () => {
        this.notificationService.showError('Une erreur est survenue lors de la mise à jour.');
      },
      complete: () => {
        this.onStatusChangeCancel();
      }
    });
  }

  onStatusChangeCancel(): void {
    this.isConfirmationModalVisible = false;
    this.workerToUpdate = null;
    this.workerToDelete = null;
  }

  // --- Delete Worker Logic ---

  promptDeleteWorker(worker: Worker): void {
    if (!this.isRH) return;

    this.workerToDelete = worker.id;
    this.modalConfig = {
      title: 'Confirmation de suppression',
      message: `Êtes-vous sûr de vouloir supprimer définitivement ${worker.name} ? Cette action est irréversible.`,
      confirmButtonText: 'Supprimer',
    };

    this.isConfirmationModalVisible = true;
  }

  onDeleteConfirm(): void {
    if (!this.workerToDelete) return;

    this.workerService.deleteWorker(this.workerToDelete).subscribe({
      next: () => {
        this.notificationService.showSuccess(`L'employé a été supprimé avec succès.`);
        this.loadInitialData(); // Reload data to reflect the change
      },
      error: (error) => {
        console.error('Error deleting worker:', error);
        this.notificationService.showError('Une erreur est survenue lors de la suppression.');
      },
      complete: () => {
        this.onStatusChangeCancel();
      }
    });
  }

  // --- File Download Logic ---
  
  loadWorkerFiles(workerId: number): void {
    this.loadingFiles.set(workerId, true);
    this.workerService.getRelatedFiles(workerId).subscribe({
      next: (fileNames) => {
        if (fileNames && fileNames.trim() !== '') {
          // Split by semicolon first, then by comma, and flatten the array
          const files = fileNames
            .split(';')
            .map(group => group.split(',').map(f => f.trim()))
            .flat()
            .filter(f => f); // Remove any empty strings
          
          this.workerFiles.set(workerId, files);
          
          // If there's only one file, download it directly
          if (files.length === 1) {
            this.downloadFile(workerId, files[0]);
          }
        } else {
          this.workerFiles.set(workerId, []);
          this.notificationService.showInfo('Aucun fichier disponible pour cet employé.');
        }
      },
      error: (error) => {
        console.error('Error loading files:', error);
        this.notificationService.showError('Erreur lors du chargement des fichiers.');
      },
      complete: () => {
        this.loadingFiles.set(workerId, false);
      }
    });
  }

  downloadFile(workerId: number, fileNames: string | string[]): void {
    // Convert single file to array for consistent handling
    const filesToDownload = Array.isArray(fileNames) ? fileNames : [fileNames];
    
    filesToDownload.forEach(fileName => {
      // Clean up the filename in case there are any path segments
      const cleanFileName = fileName.split('/').pop() || fileName;
      
      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = `${environment.apiUrl}/api/workers/photo/${encodeURIComponent(cleanFileName)}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = cleanFileName;
      
      // Append to body, click and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  hasFiles(workerId: number): boolean {
    return this.workerFiles.has(workerId) && this.workerFiles.get(workerId)!.length > 0;
  }
}