// Force recompilation by adding a comment.
import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationBackendService } from '../../core/services/notification-backend.service';
import { Notification } from '../../models/Notification.model';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { WorkerDetailsModalComponent } from '../../shared/components/worker-details-modal/worker-details-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { CongeService } from '../../core/services/conge.service';
import { AuthService } from '../../core/services/auth.service';
import { DecisionService } from '../../core/services/decision.service';
import { NotificationService } from '../../core/services/notification.service';
import { DemandeConge } from '../../models/DemandeConge.model';
import { Status } from '../../models/Status.enum';
import { Role } from '../../models/Role.enum';
import { User } from '../../models/User.model';
import { Worker } from '../../models/Worker.model';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-conges-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmationModalComponent,
    WorkerDetailsModalComponent,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './conges-management.html',
  styleUrls: ['./conges-management.scss']
})
export class CongesManagement implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['workerName', 'period', 'duration', 'type', 'status', 'actions'];
  dataSource: MatTableDataSource<DemandeConge> = new MatTableDataSource();
  private allDemandes: DemandeConge[] = [];
  stats = { pending: 0, approved: 0, refused: 0 };

  // Confirmation Modal State
  isConfirmationModalVisible = false;
  modalConfig = {
    title: '',
    message: '',
    showComment: false,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
  };
  private activeDecision: { demande: DemandeConge; isApproved: boolean } | null = null;
  currentUser: User | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  selectedStatus: string = 'TOUS';
  statusOptions = Object.values(Status);

  isModalVisible = false;
  selectedWorker: Worker | null = null;

  private notificationBackendService = inject(NotificationBackendService);

  constructor(
    private congeService: CongeService,
    private authService: AuthService,
    private decisionService: DecisionService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadDemandes();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (data: DemandeConge, filter: string) => {
      const searchString = filter.trim().toLowerCase();
      const workerName = data.worker?.name.toLowerCase() || '';
      return workerName.includes(searchString);
    };
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  canApprove(status: string): boolean {
    if (!this.currentUser) return false;
    const isAdmin = this.currentUser.role === Role.ADMIN;
    const isRh = this.currentUser.role === Role.RH;

    if (isAdmin && status === Status.EN_ATTENTE_ADMIN) return true;
    if (isRh && status === Status.EN_ATTENTE_RH) return true;

    return false;
  }

  loadDemandes(): void {
    this.congeService.getAllDemandes().subscribe((data: DemandeConge[]) => {
      this.allDemandes = data;
      this.calculateStats(data);
      this.dataSource.data = this.allDemandes;
      this.filterDemandes();
    });
  }

  filterDemandes(): void {
    let filtered = this.allDemandes;
    if (this.selectedStatus !== 'TOUS') {
      filtered = this.allDemandes.filter(d => d.status === this.selectedStatus);
    }
    this.dataSource.data = filtered;
  }

  calculateStats(demandes: DemandeConge[]): void {
    this.stats.pending = demandes.filter(d => d.status.startsWith('EN_ATTENTE')).length;
    this.stats.approved = demandes.filter(d => d.status === Status.ACCEPTE).length;
    this.stats.refused = demandes.filter(d => d.status.startsWith('REFUSE')).length;
  }

  handleApproval(demande: DemandeConge, isApproved: boolean): void {
    if (!this.canApprove(demande.status)) {
        this.notificationService.showWarning('You cannot process this request at this stage.', 'Unauthorized Action');
        return;
    }

    this.activeDecision = { demande, isApproved };
    const isFinalStep = !isApproved || this.currentUser?.role === Role.ADMIN;

    this.modalConfig = {
      title: isApproved ? 'Approve Leave Request' : 'Reject Leave Request',
      message: isApproved
        ? `Are you sure you want to approve this leave request for ${demande.worker?.name}?`
        : `Are you sure you want to reject this leave request for ${demande.worker?.name}?`,
      showComment: isFinalStep,
      confirmButtonText: isApproved ? 'Approve' : 'Reject',
      cancelButtonText: 'Cancel',
    };

    this.isConfirmationModalVisible = true;
  }

  onModalConfirm(comment: string | null): void {
    if (!this.activeDecision || !this.currentUser) {
        this.onModalClose();
        return;
    }

    const { demande, isApproved } = this.activeDecision;
    const role = this.currentUser.role;
    const isFinalStep = !isApproved || role === Role.ADMIN;

    let updateAction: Observable<any>;

    if (role === Role.RH) {
      updateAction = this.congeService.updateRHStatus(demande.id, isApproved);
    } else { // Role.ADMIN
      updateAction = this.congeService.finalApprove(demande.id, isApproved);
    }

    updateAction.subscribe(() => {
      if (isFinalStep) {
        this.createDecisionAndNotify(demande, isApproved, comment, this.currentUser!);
      } else {
        this.createIntermediateNotification(demande, this.currentUser!);
      }
      
      this.createLeaveRequestNotification(demande, isApproved ? 'APPROVED' : 'REFUSED');
    });

    this.onModalClose();
  }

  onModalClose(): void {
    this.isConfirmationModalVisible = false;
    this.activeDecision = null;
  }

  private createDecisionAndNotify(demande: DemandeConge, isApproved: boolean, comment: string | null, currentUser: User): void {
    const decision = { approved: isApproved, comment: comment || '', decisionBy: currentUser, date: new Date() };
    this.decisionService.createDecision(decision).subscribe(() => {
      this.createNotification(demande, isApproved, true, currentUser);
    });
  }

  private createIntermediateNotification(demande: DemandeConge, currentUser: User): void {
    this.createNotification(demande, true, false, currentUser);
  }

  private createNotification(demande: DemandeConge, isApproved: boolean, isFinal: boolean, currentUser: User): void {
    const notifMsg = this.createNotificationMessage(demande, isApproved, isFinal, currentUser.role, currentUser.name);
    const title = isFinal ? 'Decision Registered' : 'Intermediate Step';
    if (isApproved) {
      this.notificationService.showSuccess(notifMsg, title);
    } else {
      this.notificationService.showWarning(notifMsg, title);
    }
    this.loadDemandes();
  }

  private createNotificationMessage(demande: DemandeConge, isApproved: boolean, isFinal: boolean, role: Role, adminName: string): string {
    const fullName = demande.worker?.name || 'the employee';
    const dateRange = `from ${demande.startDate} to ${demande.endDate}`;
    const roleName = role === Role.ADMIN ? 'Director' : 'HR';

    if (!isApproved) {
      return `❌ The leave request ${dateRange} for ${fullName} was rejected by ${roleName} (${adminName}).`;
    }
    if (isFinal) {
      return `✅ The leave request ${dateRange} for ${fullName} has been finally approved.`;
    }
    return `✔ The leave request ${dateRange} for ${fullName} was validated by ${roleName} (${adminName}). Awaiting Director's validation.`;
  }

    private createLeaveRequestNotification(demande: DemandeConge, status: string): void {
    if (!demande.worker) return;

    const verb = status.startsWith('APPROVED') ? 'approuvée' : 'refusée';
    const message = `La demande de congé du ${demande.worker.name} du ${new Date(demande.startDate).toLocaleDateString()} au ${new Date(demande.endDate).toLocaleDateString()} a été ${verb}.`;

    const notification: Partial<Notification> = {
      message,
      recipient: demande.worker,
      read: false,
    };

    this.notificationBackendService.createNotification(notification as Notification).subscribe({
      error: (err: HttpErrorResponse) => console.error('Failed to create notification', err.message)
    });
  }

  calculateDuration(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  viewWorkerDetails(worker: Worker): void {
    this.selectedWorker = worker;
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.selectedWorker = null;
  }

  downloadAttachment(attachmentPath: string): void {
    this.congeService.downloadAttachment(attachmentPath);
  }

  formatStatus(status: Status): string {
    switch (status) {
      case Status.EN_ATTENTE_RH: return 'Pending HR';
      case Status.EN_ATTENTE_ADMIN: return 'Pending Director';
      case Status.REFUSE_RH: return 'Refused by HR';
      case Status.REFUSE_ADMIN: return 'Refused by Director';
      case Status.ACCEPTE: return 'Accepted';
      default: return status;
    }
  }
}
