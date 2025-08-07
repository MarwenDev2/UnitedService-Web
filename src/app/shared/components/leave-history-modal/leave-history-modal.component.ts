import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Worker } from '../../../models/Worker.model';
import { DemandeConge } from '../../../models/DemandeConge.model';
import { Status } from '../../../models/Status.enum';
import { TypeConge } from '../../../models/TypeConge.enum';

import { CongeService } from '../../../core/services/conge.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from '../../../../environments/environment';
import { WorkerService } from '../../../core/services/worker.service';

@Component({
  selector: 'app-leave-history-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-history-modal.component.html',
  styleUrls: ['./leave-history-modal.component.scss']
})
export class LeaveHistoryModalComponent implements OnInit, OnChanges {
  @Input() worker: Worker | null = null;
  @Input() isVisible: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  private congeService = inject(CongeService);
  private workerService: WorkerService = inject(WorkerService);
  allLeaveRequests: DemandeConge[] = [];
  photoUrl: string | null = null;
  filteredLeaveRequests: DemandeConge[] = [];

  // Filters
  years: (number | null)[] = [];
  leaveTypes = [null, ...Object.values(TypeConge)];
  statuses = [null, ...Object.values(Status)];

  selectedYear: number | null = null;
  selectedType: TypeConge | null = null;
  selectedStatus: Status | null = Status.ACCEPTE;

  // Stats
  stats = {
    totalDays: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  };

  ngOnInit(): void {
    this.initializeFilters();
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
  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isVisible'] || changes['worker']) && this.isVisible && this.worker) {
      this.loadLeaveRequests();
      this.workerService.getWorkerPhotoUrl(this.worker.id).subscribe(url => {
        this.photoUrl = url;
      });
    }
  }

  initializeFilters(): void {
    const currentYear = new Date().getFullYear();
    this.years = [null];
    for (let i = 0; i < 5; i++) {
      this.years.push(currentYear - i);
    }
  }

  loadLeaveRequests(): void {
    if (!this.worker) return;

        // TODO: For better performance, this should be a dedicated backend endpoint
    this.congeService.getAllDemandes().subscribe((requests: DemandeConge[]) => {
      this.allLeaveRequests = requests.filter((req: DemandeConge) => req.worker.id === this.worker?.id && new Date(req.endDate) < new Date());
            this.applyFilters();
    });
  }

  applyFilters(): void {
    let filtered = [...this.allLeaveRequests];

    if (this.selectedYear) {
        filtered = filtered.filter(req => new Date(req.startDate).getFullYear() === this.selectedYear || new Date(req.endDate).getFullYear() === this.selectedYear);
    }

    if (this.selectedType) {
        filtered = filtered.filter(req => req.type === this.selectedType);
    }

    if (this.selectedStatus) {
        filtered = filtered.filter(req => req.status === this.selectedStatus);
    }

    this.filteredLeaveRequests = filtered;
    this.updateStatistics();
  }

  updateStatistics(): void {
    this.stats.totalDays = this.filteredLeaveRequests.reduce((acc, req) => acc + this.getDuration(req), 0);
    this.stats.approved = this.allLeaveRequests.filter(req => req.status === Status.ACCEPTE).length;
    this.stats.pending = this.allLeaveRequests.filter(req => req.status === Status.EN_ATTENTE_ADMIN || req.status === Status.EN_ATTENTE_RH).length;
    this.stats.rejected = this.allLeaveRequests.filter(req => req.status === Status.REFUSE_ADMIN || req.status === Status.REFUSE_RH).length;
  }

  getDuration(demande: DemandeConge): number {
    const start = new Date(demande.startDate);
    const end = new Date(demande.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  handleClose(): void {
    this.closeModal.emit();
  }

  handleExportPDF(): void {
    if (!this.worker) return;

    const doc = new jsPDF({ orientation: 'landscape' });

    doc.text(`Historique des Congés - ${this.worker.name}`, 14, 20);

    const tableData = this.filteredLeaveRequests.map(req => [
      req.type,
      `${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}`,
      `${this.getDuration(req)} jours`,
      req.status,
      req.reason
    ]);

    autoTable(doc, {
      head: [['Type', 'Période', 'Durée', 'Statut', 'Motif']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [13, 71, 161] }
    });

    doc.save(`historique_conges_${this.worker.name}.pdf`);
  }
}
