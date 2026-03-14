import { Component, inject, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationBackendService } from '../../core/services/notification-backend.service';
import { Notification as AppNotification } from '../../models/Notification.model';
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
import { PushNotificationService } from '../../core/services/push-notification.service';

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
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  selectedStatus: string = 'TOUS';
  statusOptions = Object.values(Status);

  isModalVisible = false;
  selectedWorker: Worker | null = null;

  selectedRow: DemandeConge | null = null;
showScrollHint = true;

  private notificationBackendService = inject(NotificationBackendService);
  input: any;

  constructor(
    private congeService: CongeService,
    private authService: AuthService,
    private decisionService: DecisionService,
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadDemandes();
    this.checkPushSubscriptionStatus();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (data: DemandeConge, filter: string) => {
      const searchString = filter.trim().toLowerCase();
      const workerName = data.worker?.name.toLowerCase() || '';
      return workerName.includes(searchString);
    };
    
    // Check scroll after view init
    setTimeout(() => {
      this.checkScrollOverflow();
    }, 100);
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  
// Get type icon
getTypeIcon(type: string): string {
  const iconMap: { [key: string]: string } = {
    'ANNUEL': 'fas fa-sun',
    'MALADIE': 'fas fa-heartbeat',
    'MATERNITE': 'fas fa-baby',
    'SANS_SOLDE': 'fas fa-money-bill-wave',
    'AUTRE': 'fas fa-ellipsis-h'
  };
  return iconMap[type] || 'fas fa-tag';
}

// Get type label
getTypeLabel(type: string): string {
  const labelMap: { [key: string]: string } = {
    'ANNUEL': 'Annuel',
    'MALADIE': 'Maladie',
    'MATERNITE': 'Maternité',
    'SANS_SOLDE': 'Sans solde',
    'AUTRE': 'Autre'
  };
  return labelMap[type] || type;
}

// Get status icon
getStatusIcon(status: string): string {
  switch (status) {
    case Status.EN_ATTENTE_RH:
    case Status.EN_ATTENTE_ADMIN:
      return 'fas fa-clock';
    case Status.ACCEPTE:
      return 'fas fa-check-circle';
    case Status.REFUSE_RH:
    case Status.REFUSE_ADMIN:
      return 'fas fa-times-circle';
    default:
      return 'fas fa-circle';
  }
}

// Select row
selectRow(row: DemandeConge): void {
  this.selectedRow = this.selectedRow === row ? null : row;
}

// Clear filters
clearFilters(): void {
  this.selectedStatus = 'TOUS';
  this.dataSource.filter = '';
  if (this.input) {
    this.input.value = '';
  }
  this.filterDemandes();
}

checkScrollOverflow(): void {
  if (this.scrollContainer) {
    const container = this.scrollContainer.nativeElement;
    const hasOverflow = container.scrollWidth > container.clientWidth;
    container.classList.toggle('has-scroll', hasOverflow);
    this.showScrollHint = hasOverflow;
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
        
        // SEND PUSH NOTIFICATION TO THE EMPLOYEE
        if (demande.worker?.id) {
          this.sendPushNotificationToAll(demande, isApproved);
        }
        
      } else {
        this.createIntermediateNotification(demande, this.currentUser!);
      }
      
      // This only creates database notification
      this.createLeaveRequestNotification(demande, isApproved ? 'APPROVED' : 'REFUSED');
    });

    this.onModalClose();
  }

  private sendPushNotificationToEmployee(demande: DemandeConge, isApproved: boolean): void {
    const statusText = isApproved ? 'approved' : 'refused';
    const employeeId = demande.worker?.id;
    const employeeName = demande.worker?.name || 'Employee';
    
    if (!employeeId) {
      console.warn('No employee ID found for push notification');
      return;
    }

    // Method 1: Send directly through your PushNotificationService
    this.pushNotificationService.sendCustomNotification(
      `Leave Request ${isApproved ? 'Approved' : 'Rejected'}`,
      `Your leave request from ${demande.startDate} to ${demande.endDate} has been ${statusText}`,
      'leave_request',
      {
        url: '/my-leaves',
        status: statusText,
        requestId: demande.id,
        timestamp: new Date().toISOString()
      }
      
    ).then(() => {
      console.log('Push notification sent to employee');
    }).catch(error => {
      console.error('Failed to send push notification:', error);
    });
  }

  private sendPushNotificationToAll(demande: DemandeConge, isApproved: boolean): void {
    const statusText = isApproved ? 'approved' : 'rejected';
    const employeeName = demande.worker?.name || 'Employee';
    const adminName = this.currentUser?.name || 'Admin';

    // Send to ALL users (backend will send to all subscriptions)
    this.pushNotificationService.sendCustomNotification(
      `Leave Request ${isApproved ? 'Approved' : 'Rejected'}`,
      `Leave request for ${employeeName} has been ${statusText} by ${adminName}`,
      'leave_request',
      {
        url: '/conges',
        status: statusText,
        requestId: demande.id,
        approvedBy: adminName,
        timestamp: new Date().toISOString()
      }
    ).then(() => {
      console.log('✅ Notification sent to all users');
    }).catch(error => {
      console.error('❌ Failed to send notification:', error);
    });
  }

  onModalClose(): void {
    this.isConfirmationModalVisible = false;
    this.activeDecision = null;
  }

  // ***************************************************************************************************************************************************************** */
  private async checkPushSubscriptionStatus(): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          console.log('🎯 YOU ARE SUBSCRIBED TO PUSH NOTIFICATIONS!');
          console.log('Subscription endpoint:', subscription.endpoint);
          console.log('Subscription JSON:', subscription.toJSON());
        } else {
          console.log('⚠️ YOU ARE NOT SUBSCRIBED to push notifications.');
          console.log('To receive notifications, click "Enable Push Notifications"');
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  }
  async enablePushNotifications(): Promise<void> {
    console.log('=== Starting Push Notification Setup ===');
    
    // 1. Check if supported
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      this.notificationService.showError('Push notifications not supported in this browser', 'Not Supported');
      return;
    }
    
    // 2. Check current permission
    console.log('Current permission:', Notification.permission);
    
    if (Notification.permission === 'denied') {
      this.notificationService.showWarning(
        'Notifications are blocked. Please enable them in browser settings.',
        'Permission Denied'
      );
      return;
    }
    
    // 3. Request permission if needed
    if (Notification.permission === 'default') {
      const granted = await this.pushNotificationService.requestPermission();
      if (!granted) {
        this.notificationService.showWarning('Notification permission denied', 'Permission Required');
        return;
      }
    }
    
    // 4. SUBSCRIBE to push notifications
    console.log('Subscribing to push notifications...');
    const subscription = await this.pushNotificationService.subscribeToPush();
    
    if (subscription) {
      console.log('✅ Successfully subscribed to push notifications!');
      console.log('Subscription details:', subscription.toJSON());
      
      this.notificationService.showSuccess(
        'Push notifications enabled! You will now receive notifications.',
        'Success'
      );
      
      // 5. Test immediately
      setTimeout(() => {
        this.testPushNotification();
      }, 1000);
    } else {
      this.notificationService.showError('Failed to subscribe to push notifications', 'Error');
    }
  }

  async testPushNotification(): Promise<void> {
    console.log('=== Testing Push Notification ===');
    
    // Test 1: Check subscription
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('❌ No subscription found. You need to enable push notifications first.');
        this.notificationService.showWarning(
          'Please enable push notifications first using the "Enable Push Notifications" button.',
          'Not Subscribed'
        );
        return;
      }
      
      console.log('✅ Subscription found:', subscription.endpoint);
      
      // Test 2: Send test notification
      await this.pushNotificationService.sendTestNotification();
      console.log('✅ Test notification sent to backend');
      
      this.notificationService.showSuccess(
        'Test notification sent! Check your device for the notification.',
        'Test Sent'
      );
    }
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
    const message = `La demande de congé du ${demande.worker.name} du ${new Date(demande.startDate).toLocaleDateString()} au ${new Date(demande.endDate).toLocaleDateString()} a été ${verb} par ${this.currentUser?.role}.`;

    const notification: Partial<AppNotification> = {
      message,
      recipient: demande.worker,
      read: false,
    };

    this.notificationBackendService.createNotification(notification as AppNotification).subscribe({
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
