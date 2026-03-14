import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { DemandeAvance } from '../../models/demande-avance.model';
import { DemandeAvanceService } from '../../core/services/demande-avance.service';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../models/Notification.model';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../models/Role.enum';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { WorkerService } from '../../core/services/worker.service';
import { switchMap, map, forkJoin, of } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { WorkerDetailsModalComponent } from '../../shared/components/worker-details-modal/worker-details-modal.component';
import { Worker } from '../../models/Worker.model';
import { NotificationBackendService } from '../../core/services/notification-backend.service';
import { Status } from '../../models/Status.enum';

declare var bootstrap: any; // To interact with Bootstrap's JS

@Component({
  selector: 'app-demande-avance-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    WorkerDetailsModalComponent
  ],
  templateUrl: './demande-avance-management.html',
  styleUrls: ['./demande-avance-management.scss']
})
export class DemandeAvanceManagementComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['workerName', 'requestedAmount', 'adminResponseAmount', 'dateRequest', 'status', 'actions'];
  dataSource: MatTableDataSource<DemandeAvance> = new MatTableDataSource();
  
  selectedDemande: DemandeAvance | null = null;
  adminResponse = { amount: 0, comment: '' };
  private adminModal: any;
  isAdmin = false;
  isRH = false;
  isLoading = true;

  isWorkerModalVisible = false;
  selectedWorker: Worker | null = null;

  adminComment: string = '';
  adminResponseAmount: number | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('adminForm') adminForm!: NgForm;
  input: any;

  constructor(
    private demandeAvanceService: DemandeAvanceService,
    private notificationService: NotificationService,
    private notificationBackendService: NotificationBackendService,
    private authService: AuthService,
    private workerService: WorkerService
  ) {
    const user = this.authService.getUser();
    this.isAdmin = user?.role === Role.ADMIN;
    this.isRH = user?.role === Role.RH;
  }

  ngOnInit(): void {
    this.loadDemandes();
  }

  ngAfterViewInit(): void {
    const modalElement = document.getElementById('adminResponseModal');
    if (modalElement) {
      this.adminModal = new bootstrap.Modal(modalElement);
    }
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getPendingCount(): number {
  return this.dataSource.data.filter(d => d.status === Status.EN_ATTENTE_ADMIN.valueOf()).length;
  }

  getApprovedCount(): number {
    return this.dataSource.data.filter(d => d.status === Status.ACCEPTE.valueOf()).length;
  }

  getRefusedCount(): number {
    return this.dataSource.data.filter(d => d.status === Status.REFUSE_ADMIN.valueOf()).length;
  }

  getTotalAmount(): number {
    return this.dataSource.data
      .filter(d => d.status === Status.ACCEPTE.valueOf())
      .reduce((sum, d) => sum + (d.adminResponseAmount || 0), 0);
  }

  // Status methods
  getStatusIcon(status: string): string {
    switch (status) {
      case Status.EN_ATTENTE_ADMIN: return 'fas fa-clock';
      case Status.ACCEPTE: return 'fas fa-check-circle';
      case Status.REFUSE_ADMIN: return 'fas fa-times-circle';
      default: return 'fas fa-circle';
    }
  }
  // Filter methods
  selectedStatus: string = 'ALL';
  showMobileFilters = false;

  applyStatusFilter(): void {
    if (this.selectedStatus === 'ALL') {
      this.dataSource.filter = '';
    } else {
      this.dataSource.filterPredicate = (data: DemandeAvance, filter: string) => {
        return data.status === filter;
      };
      this.dataSource.filter = this.selectedStatus;
    }
  }

  applyNameFilter(event: Event): void {
  const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
  
  // Update the filter predicate to use only properties that exist in DemandeAvance
  this.dataSource.filterPredicate = (data: DemandeAvance, filter: string) => {
    // Only use workerName since that's what we have in the DemandeAvance interface
    return data.workerName?.toLowerCase().includes(filter) || false;
  };
  
  this.dataSource.filter = filterValue;
}

  clearFilters(): void {
    this.selectedStatus = 'ALL';
    this.dataSource.filter = '';
    if (this.input) {
      this.input.value = '';
    }
  }

  // Add this method to your component class
  toggleMobileFilters(): void {
    this.showMobileFilters = !this.showMobileFilters;
  }

  selectedRow: DemandeAvance | null = null;

  selectRow(row: DemandeAvance): void {
    // Handle row selection
    this.selectedRow = this.selectedRow === row ? null : row;
  }

  calculatePercentage(): number {
  if (!this.selectedDemande?.requestedAmount || !this.adminResponseAmount) {
    return 0;
  }
  return (this.adminResponseAmount / this.selectedDemande.requestedAmount) * 100;
}

  loadDemandes(): void {
    this.isLoading = true;
    this.demandeAvanceService.getAllDemandeAvances().pipe(
      switchMap(demandes => {
        if (demandes.length === 0) {
          return of([]);
        }
        const workerRequests = demandes.map(demande =>
          this.workerService.getWorkerById(demande.workerId).pipe(
            map(worker => ({
              ...demande,
              worker: worker,
              workerName: worker.name
            }))
          )
        );
        return forkJoin(workerRequests);
      })
    ).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.notificationService.showError('Erreur lors du chargement des demandes.');
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  openResponseModal(demande: DemandeAvance): void {
    this.selectedDemande = { ...demande };
    this.adminResponse = { amount: 0, comment: '' }; // Reset form
    if (this.adminModal) {
      this.adminModal.show();
    }
  }

  viewWorkerDetails(workerid: number): void {
    this.workerService.getWorkerById(workerid).subscribe({
      next: (worker) => {
        this.selectedWorker = worker;
        this.isWorkerModalVisible = true;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails du worker:', err);
      }
    });
  }

  closeWorkerModal(): void {
    this.isWorkerModalVisible = false;
    this.selectedWorker = null;
  }

  closeAdminModal() {
    if (this.adminModal) {
      this.adminModal.hide();
    }
  }

  onAdminSubmit(status: 'accepte' | 'refuse_admin') {
    if (!this.selectedDemande || !this.adminForm.valid) {
      return;
    }
  
    const responseAmount = (status === 'accepte' && this.adminResponseAmount) ? this.adminResponseAmount : 0;
    const workerId = this.selectedDemande.workerId; // Get workerId from the selectedDemande
  
    this.demandeAvanceService.updateAdminResponse(
      this.selectedDemande.id,
      responseAmount,
      this.adminComment
    ).pipe(
      switchMap(() => {
        if (!workerId) {
          console.error('Worker ID is not available');
          return of(null);
        }
        
        // Create notification matching the Notification interface
        const notification = {
          id: 0, // Will be set by the backend
          recipient: { 
            id: workerId,
            name: this.selectedDemande?.workerName || 'Utilisateur',
            // Required Worker properties with defaults
            cin: '',
            department: '',
            position: '',
            email: '',
            phone: '',
            address: '',
            hiringDate: new Date().toISOString(),
            salary: 0,
            status: 'active',
            role: 'worker',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as any, // Using type assertion since we're providing required fields
          message: `La demande d'avance du ${this.selectedDemande?.workerName} a été ${status === 'accepte' ? 'approuvée' : 'refusée'}.`,
          read: false,
          timestamp: new Date().toISOString()
        };
        return this.notificationBackendService.createNotification(notification);
      })
    ).subscribe({
      next: () => {
        this.notificationService.showSuccess('Réponse enregistrée avec succès.');
        this.loadDemandes();
        this.closeAdminModal();
      },
      error: (err) => {
        this.notificationService.showError("Erreur lors de l'enregistrement de la réponse.");
        console.error(err);
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'EN_ATTENTE_ADMIN': return 'status-en_attente_admin';
      case 'ACCEPTE': return 'status-accepte';
      case 'REFUSE_ADMIN': return 'status-refuse_admin';
      default: return 'status-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'EN_ATTENTE_ADMIN': return 'En attente Admin';
      case 'ACCEPTE': return 'Acceptée';
      case 'REFUSE_ADMIN': return 'Refusée par Admin';
      default: return status;
    }
  }
}
