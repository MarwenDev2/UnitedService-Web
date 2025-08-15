import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Worker } from '../../../models/Worker.model';
import { WorkerService } from '../../../core/services/worker.service';
import { Role } from '../../../models/Role.enum';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-worker-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worker-details-modal.component.html',
  styleUrls: ['./worker-details-modal.component.scss']
})
export class WorkerDetailsModalComponent implements OnChanges {
  @Input() worker: Worker | null = null;
  @Output() close = new EventEmitter<void>();
    private workerService: WorkerService = inject(WorkerService);
  photoUrl: string | null = null;
  isSecretaire = false;
  constructor(private authService: AuthService,){
    const user = this.authService.getUser();
    this.isSecretaire = user?.role === Role.SECRETAIRE;
  }
  closeModal(): void {
    this.close.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['worker'] && this.worker) {
      this.workerService.getWorkerPhotoUrl(this.worker.id).subscribe(url => {
        this.photoUrl = url;
      });
    }
  }

    getAvatar(worker: Worker): string {
      if (this.photoUrl) {
        return `${environment.apiUrl}${this.photoUrl}`;
      }
  
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
}
