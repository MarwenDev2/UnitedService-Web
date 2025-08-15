import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MissionRequestService } from '../../core/services/mission-request.service';
import { MissionRequest } from '../../models/MissionRequest.model';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../models/User.model';
import { Worker } from '../../models/Worker.model';
import { WorkerService } from '../../core/services/worker.service';
import { DecisionService } from '../../core/services/decision.service';
import { NotificationService } from '../../core/services/notification.service';
import { Role } from '../../models/Role.enum';
import { Status } from '../../models/Status.enum';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { WorkerDetailsModalComponent } from '../../shared/components/worker-details-modal/worker-details-modal.component';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { NotificationBackendService } from '../../core/services/notification-backend.service';
import { Notification } from '../../models/Notification.model';

@Component({
  selector: 'app-mission-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    ConfirmationModalComponent,
    WorkerDetailsModalComponent
  ],
  templateUrl: './mission-management.html',
  styleUrls: ['./mission-management.scss']
})
export class MissionManagementComponent implements OnInit {
  displayedColumns: string[] = ['workerName', 'requestDate', 'destination', 'status', 'actions'];
  dataSource: MatTableDataSource<any> = new MatTableDataSource();
  private allMissions: any[] = [];

  currentUser: User | null = null;
  isConfirmationModalVisible = false;
  isWorkerModalVisible = false;
  selectedWorker: Worker | null = null;

  stats = { pending: 0, approved: 0, refused: 0 };
  selectedStatus: string = 'TOUS';
  statusOptions: string[] = Object.values(Status);
  nameFilterValue: string = '';

  modalConfig = {
    title: '',
    message: '',
    showComment: false,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
  };
  private activeDecision: { mission: MissionRequest; isApproved: boolean } | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private missionRequestService: MissionRequestService,
    private workerService: WorkerService,
    private authService: AuthService,
    private decisionService: DecisionService,
    private notificationService: NotificationService,
    private notificationBackendService: NotificationBackendService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadMissions();
  }

  loadMissions(): void {
    this.missionRequestService.getAllMissions().pipe(
      switchMap(missions => {
        if (!missions || missions.length === 0) {
          return of([]);
        }
        const missionsWithWorkers$ = missions.map(mission => {
          // The backend might send workerId directly, or a worker object that is null.
          // We need to fetch the worker details if they are not already populated.
          const workerId = mission.worker ? mission.worker.id : (mission as any).workerId;
          if (!workerId) {
            // If there's no worker and no workerId, we can't fetch the details.
            return of({ ...mission, workerName: 'Unknown Worker' });
          }
          return this.workerService.getWorkerById(workerId).pipe(
            map(worker => ({ ...mission, worker, workerName: worker.name }))
          );
        });
        return forkJoin(missionsWithWorkers$);
      })
    ).subscribe(missionsWithData => {
      this.allMissions = missionsWithData;
      this.dataSource.data = this.allMissions;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.calculateStats(this.allMissions);
      this.applyFilter();
    });
  }

  calculateStats(missions: any[]): void {
    this.stats = {
      pending: missions.filter(m => m.status.startsWith('EN_ATTENTE')).length,
      approved: missions.filter(m => m.status === Status.ACCEPTE).length,
      refused: missions.filter(m => m.status.startsWith('REFUSE')).length,
    };
  }

  applyFilter(): void {
    let filteredData = this.allMissions;

    if (this.selectedStatus !== 'TOUS') {
      filteredData = filteredData.filter(m => m.status === this.selectedStatus);
    }

    if (this.nameFilterValue) {
      filteredData = filteredData.filter(m => 
        m.workerName.toLowerCase().includes(this.nameFilterValue.toLowerCase())
      );
    }

    this.dataSource.data = filteredData;

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  applyNameFilter(event: Event): void {
    this.nameFilterValue = (event.target as HTMLInputElement).value;
    this.applyFilter();
  }

  canApprove(status: Status): boolean {
    if (!this.currentUser) return false;
    const role = this.currentUser.role;
    return (role === Role.RH && status === Status.EN_ATTENTE_RH) || 
           (role === Role.ADMIN && status === Status.EN_ATTENTE_ADMIN);
  }

  isApproved(status: Status): boolean {
    if (!this.currentUser) return false;
    const role = this.currentUser.role;
    return (role === Role.RH && status === Status.ACCEPTE) || 
           (role === Role.ADMIN && status === Status.ACCEPTE);
  }

  openConfirmationModal(mission: MissionRequest, isApproved: boolean): void {
    this.activeDecision = { mission, isApproved };
    const isFinalStep = !isApproved || this.currentUser?.role === Role.ADMIN;

    this.modalConfig = {
      title: isApproved ? 'Approuver la demande' : 'Rejeter la demande',
      message: `Êtes-vous sûr de vouloir ${isApproved ? 'approuver' : 'rejeter'} cette demande ?`,
      showComment: isFinalStep,
      confirmButtonText: isApproved ? 'Approuver' : 'Rejeter',
      cancelButtonText: 'Annuler',
    };

    this.isConfirmationModalVisible = true;
  }

  onModalConfirm(comment: any): void {
    if (!this.activeDecision || !this.currentUser) return;
  
    const { mission, isApproved } = this.activeDecision;
    const role = this.currentUser.role;
    const isFinalStep = !isApproved || role === Role.ADMIN;
  
    let updateAction: Observable<any>;
  
    if (role === Role.RH) {
      updateAction = this.missionRequestService.updateRHStatus(mission.id, isApproved);
    } else { // Role.ADMIN
      updateAction = this.missionRequestService.finalApprove(mission.id, isApproved);
    }
  
    updateAction.pipe(
      switchMap(() => {
        if (!mission.worker || !mission.worker.id) {
          console.error('Worker information is missing from the mission:', mission);
          return throwError(() => new Error('Worker information is missing'));
        }
        
        // Create a notification after successful update
        const notification: Notification = {
          id: 0,
          recipient: mission.worker, // Use the worker from the mission
          message: `La demande d'ordre de mission du ${mission.worker.name} à ${mission.destination} le ${new Date(mission.missionDate).toLocaleDateString()} a été ${isApproved ? 'approuvée' : 'refusée'}.`,
          read: false,
          timestamp: new Date().toISOString(),
        };
        
        console.log('Creating notification for worker:', mission.worker);
        return this.notificationBackendService.createNotification(notification).pipe(
          catchError(error => {
            console.error('Error creating notification:', error);
            // Continue the stream even if notification fails
            return of(null);
          })
        );
      })
    ).subscribe({
      next: () => {
        this.notificationService.showSuccess('Décision enregistrée avec succès.');
        this.loadMissions();
        this.isConfirmationModalVisible = false;
      },
      error: (err) => {
        this.notificationService.showError("Erreur lors de l'enregistrement de la décision.");
        console.error(err);
      }
    });
  }

  onModalClose(): void {
    this.isConfirmationModalVisible = false;
    this.activeDecision = null;
  }

  viewWorkerDetails(mission: MissionRequest): void {
    this.selectedWorker = mission.worker;
    this.isWorkerModalVisible = true;
  }

  closeWorkerModal(): void {
    this.isWorkerModalVisible = false;
    this.selectedWorker = null;
  }

  private createDecisionAndNotify(mission: MissionRequest, isApproved: boolean, comment: string | null, currentUser: User): void {
    const decision = { approved: isApproved, comment: comment || '', decisionBy: currentUser, date: new Date() };
    this.decisionService.createDecision(decision).subscribe(() => {
      this.createNotification(mission, isApproved, true, currentUser);
    });
  }

  private createIntermediateNotification(mission: MissionRequest, currentUser: User): void {
    this.createNotification(mission, true, false, currentUser);
  }

  private createNotification(mission: MissionRequest, isApproved: boolean, isFinal: boolean, currentUser: User): void {
    const notifMsg = this.createNotificationMessage(mission, isApproved, isFinal, currentUser.role, currentUser.name);
    const title = isFinal ? 'Décision enregistrée' : 'Étape intermédiaire';
    if (isApproved) {
      this.notificationService.showSuccess(notifMsg, title);
    } else {
      this.notificationService.showWarning(notifMsg, title);
    }
  }

  private createNotificationMessage(mission: MissionRequest, isApproved: boolean, isFinal: boolean, role: Role, adminName: string): string {
    const fullName = (mission as any).workerName || 'the employee';
    const roleName = role === Role.ADMIN ? 'Directeur' : 'RH';

    if (!isApproved) {
      return `❌ L'ordre de mission pour ${fullName} à ${mission.destination} a été rejeté par ${roleName} (${adminName}).`;
    }
    if (isFinal) {
      return `✅ L'ordre de mission pour ${fullName} à ${mission.destination} a été approuvé.`;
    }
    return `✔ L'ordre de mission pour ${fullName} à ${mission.destination} a été validé par ${roleName} (${adminName}). En attente de la validation du Directeur.`;
  }

  formatStatus(status: Status | string): string {
    const statusEnum = status as Status;
    switch (statusEnum) {
      case Status.EN_ATTENTE_RH: return 'En attente RH';
      case Status.EN_ATTENTE_ADMIN: return 'En attente Directeur';
      case Status.REFUSE_RH: return 'Refusé par RH';
      case Status.REFUSE_ADMIN: return 'Refusé par Directeur';
      case Status.ACCEPTE: return 'Accepté';
      default: return status;
    }
  }

  generatePdf(mission: any): void {
    const { workerName, destination, missionDate, dateRequest, status, worker } = mission;
    const doc = new jsPDF();
    const pdfContent = `
      <div style="font-family: 'Poppins', sans-serif; padding: 30px; width: 210mm; margin: 0 auto;">
        <!-- Header with Logo and Company Name -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="assets/logo.png" alt="United Service Logo" style="max-height: 80px; margin-bottom: 10px;">
          <h1 style="color: #C6A34F; font-size: 28px; font-weight: 600;">United Service</h1>
          <p style="color: #333; font-size: 14px;">123 Rue de l'Entreprise, Tunis, Tunisie | Tel: +216 71 234 567 | Email: contact@unitedservice.tn</p>
        </div>

        <!-- Title -->
        <h2 style="color: #333; font-size: 24px; text-align: center; border-bottom: 3px solid #C6A34F; padding-bottom: 10px; margin-bottom: 20px;">Ordre de Mission</h2>

        <!-- Mission Details -->
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #C6A34F; font-size: 18px; margin-bottom: 10px;">Détails de la Mission</h3>
          <p><strong>Demandeur :</strong> <span style="color: #555;">${workerName}</span></p>
          <p><strong>CIN :</strong> <span style="color: #555;">${worker?.cin || 'N/A'}</span></p>
          <p><strong>Adresse :</strong> <span style="color: #555;">${worker?.address || 'N/A'}</span></p>
          <p><strong>Date de la demande :</strong> <span style="color: #555;">${new Date(dateRequest).toLocaleDateString('fr-FR')}</span></p>
          <p><strong>Date de la mission :</strong> <span style="color: #555;">${new Date(missionDate).toLocaleDateString('fr-FR')}</span></p>
          <p><strong>Destination :</strong> <span style="color: #555;">${destination}</span></p>
          <p><strong>Statut :</strong> <span style="color: ${status === 'ACCEPTE' ? '#28a745' : '#dc3545'}; font-weight: bold;">${this.formatStatus(status)}</span></p>
        </div>

        <!-- Decisions -->
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
          <h3 style="color: #C6A34F; font-size: 18px; margin-bottom: 10px;">Historique des Décisions</h3>
          <p><strong>Sécrétaire :</strong> <span style="color: #555;">${mission.secretaireDecision?.approved ? 'Approuvé' : 'Refusé'} ${mission.secretaireDecision?.comment ? ` - ${mission.secretaireDecision.comment}` : ''}</span></p>
          <p><strong>RH :</strong> <span style="color: #555;">${mission.rhDecision?.approved ? 'Approuvé' : mission.rhDecision ? 'Refusé' : 'En attente'} ${mission.rhDecision?.comment ? ` - ${mission.rhDecision.comment}` : ''}</span></p>
          <p><strong>Directeur :</strong> <span style="color: #555;">${mission.adminDecision?.approved ? 'Approuvé' : mission.adminDecision ? 'Refusé' : 'En attente'} ${mission.adminDecision?.comment ? ` - ${mission.adminDecision.comment}` : ''}</span></p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 30px; text-align: right; color: #777; font-size: 12px; font-style: italic;">
          Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Ordre de Mission - United Service</title>');
      printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">');
      printWindow.document.write('<style>body { margin: 0; padding: 0; font-family: "Poppins", sans-serif; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(pdfContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
      printWindow.close();

      // Generate and download PDF
      const pdfElement = document.createElement('div');
      pdfElement.innerHTML = pdfContent;
      document.body.appendChild(pdfElement);

      html2canvas(pdfElement, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`ordre_de_mission_${workerName}_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.removeChild(pdfElement);
      });
    }
  }
}