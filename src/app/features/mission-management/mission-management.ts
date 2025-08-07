import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
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
import { forkJoin, of, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

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
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadMissions();
  }

  loadMissions(): void {
    this.missionRequestService.getAllMissions().pipe(
      switchMap(missions => {
        if (missions.length === 0) {
          return of([]);
        }
        const missionsWithWorkers$ = missions.map(mission =>
          this.workerService.getWorkerById(mission.workerId).pipe(
            map(worker => ({ ...mission, worker, workerName: worker.name }))
          )
        );
        return forkJoin(missionsWithWorkers$);
      })
    ).subscribe(missionsWithData => {
      this.allMissions = missionsWithData;
      this.calculateStats(this.allMissions);
      this.applyFilter();
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
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

    updateAction.subscribe(() => {
      if (isFinalStep) {
        this.createDecisionAndNotify(mission, isApproved, comment, this.currentUser!);
      } else {
        this.createIntermediateNotification(mission, this.currentUser!);
      }
      this.loadMissions(); // Refresh data
    });

    this.onModalClose();
  }

  onModalClose(): void {
    this.isConfirmationModalVisible = false;
    this.activeDecision = null;
  }

  viewWorkerDetails(worker: Worker): void {
    this.selectedWorker = worker;
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
}
