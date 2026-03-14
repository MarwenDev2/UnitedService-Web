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
  filteredLeaveRequests: DemandeConge[] = [];
  photoUrl: string | null = null;

  // Filters
  years: (number | null)[] = [];
  leaveTypes = [null, ...Object.values(TypeConge)];
  statuses = [null, ...Object.values(Status)];

  selectedYear: number | null = null;
  selectedType: TypeConge | null = null;
  selectedStatus: Status | null = null;

  ngOnInit(): void {
    this.initializeFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isVisible'] || changes['worker']) && this.isVisible && this.worker) {
      this.loadLeaveRequests();
      this.loadWorkerPhoto();
    }
  }

  initializeFilters(): void {
    const currentYear = new Date().getFullYear();
    this.years = [null];
    for (let i = 0; i < 5; i++) {
      this.years.push(currentYear - i);
    }
  }

  loadWorkerPhoto(): void {
    if (this.worker) {
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
    return `/uploads/photos/${defaultImage}`;
  }

  handleImageError(event: Event, worker: Worker): void {
    const imgElement = event.target as HTMLImageElement;
    const defaultUrl = worker.gender.toLowerCase() === 'femme' 
      ? '/uploads/photos/default-female.png' 
      : '/uploads/photos/default-male.png';
    imgElement.src = defaultUrl;
  }

  loadLeaveRequests(): void {
    if (!this.worker) return;

    this.congeService.getAllDemandes().subscribe((requests: DemandeConge[]) => {
      // Filter for this worker and past requests only
      this.allLeaveRequests = requests.filter(req => 
        req.worker.id === this.worker?.id && 
        new Date(req.endDate) < new Date()
      );
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let filtered = [...this.allLeaveRequests];

    if (this.selectedYear) {
      filtered = filtered.filter(req => 
        new Date(req.startDate).getFullYear() === this.selectedYear || 
        new Date(req.endDate).getFullYear() === this.selectedYear
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter(req => req.type === this.selectedType);
    }

    if (this.selectedStatus) {
      filtered = filtered.filter(req => req.status === this.selectedStatus);
    }

    this.filteredLeaveRequests = filtered;
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
    if (!this.worker || this.filteredLeaveRequests.length === 0) return;

    const doc = new jsPDF({ orientation: 'portrait' });

    // Title
    doc.setFontSize(16);
    doc.text(`Historique des Congés - ${this.worker.name}`, 14, 20);

    // Subtitle
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    // Table data
    const tableData = this.filteredLeaveRequests.map(req => [
      req.type,
      `${new Date(req.startDate).toLocaleDateString('fr-FR')} - ${new Date(req.endDate).toLocaleDateString('fr-FR')}`,
      `${this.getDuration(req)} jours`,
      req.status,
      req.reason || '-'
    ]);

    // Create table
    autoTable(doc, {
      head: [['Type', 'Période', 'Durée', 'Statut', 'Motif']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 30 },
        4: { cellWidth: 'auto' }
      }
    });

    // Save PDF
    doc.save(`historique-conges-${this.worker.name.replace(/\s+/g, '-')}.pdf`);
  }
}