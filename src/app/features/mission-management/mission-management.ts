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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { NotificationBackendService } from '../../core/services/notification-backend.service';
import { Notification } from '../../models/Notification.model';
import { firstValueFrom } from 'rxjs';
import { WorkersListModalComponent } from '../../shared/components/workers-list-modal/workers-list-modal';

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
    ConfirmationModalComponent
  ],
  templateUrl: './mission-management.html',
  styleUrls: ['./mission-management.scss']
})
export class MissionManagementComponent implements OnInit {
  displayedColumns: string[] = ['requestDate','missionDate','endDate', 'destination', 'status', 'actions'];
  dataSource: MatTableDataSource<any> = new MatTableDataSource();
  private allMissions: any[] = [];

  currentUser: User | null = null;
  isConfirmationModalVisible = false;
  isSecretaire = false;
  isWorkerModalVisible = false;
  selectedWorker: Worker | null = null;
  selectedWorkers: Worker[] = [];
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
    this.isSecretaire = this.currentUser?.role === Role.SECRETAIRE;
  }

  private getWorkerName = (w: any) =>
    (w?.name?.trim?.()) ||
    [w?.firstName, w?.lastName].filter(Boolean).join(' ').trim() ||
    'N/A';
  
  private getWorkerPosition = (w: any) =>
    w?.position || w?.jobTitle || w?.fonction || 'N/A';

  
  loadMissions(): void {
    this.missionRequestService.getAllMissions().pipe(
      switchMap(missions => {
        if (!missions || missions.length === 0) return of([]);
        
        // Use the new endpoint to get missions with workers
        return forkJoin(
          missions.map(mission => 
            this.missionRequestService.getMissionWithWorkers(mission.id).pipe(
              catchError(() => {
                // Fallback to basic mission data if worker fetch fails
                console.warn('Failed to fetch workers for mission:', mission.id);
                return of({
                  ...mission,
                  workers: [],
                  workerName: ''
                });
              })
            )
          )
        );
      })
    ).subscribe({
      next: (missionsWithWorkers) => {
        console.log('Missions with workers loaded:', missionsWithWorkers);
        this.allMissions = missionsWithWorkers.map(mission => ({
          ...mission,
          workerName: this.getWorkerName(mission.workers?.[0])
        }));
        
        this.dataSource.data = this.allMissions;
        if (this.paginator) this.dataSource.paginator = this.paginator;
        if (this.sort) this.dataSource.sort = this.sort;
        this.calculateStats(this.allMissions);
        this.applyFilter();
      },
      error: (e) => {
        console.error('Error loading missions:', e);
        this.notificationService.showError('Erreur lors du chargement des missions');
      }
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
    return (role === Role.SECRETAIRE && status === Status.ACCEPTE) || 
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
  
    let updateAction: Observable<any>;
    if (role === Role.RH) {
      updateAction = this.missionRequestService.updateRHStatus(mission.id, isApproved, comment || '');
    } else {
      updateAction = this.missionRequestService.finalApprove(mission.id, isApproved, comment || '');
    }
  
    updateAction.subscribe({
      next: () => {
        // ✅ utilise la méthode centralisée
        this.createDecisionAndNotify(mission, isApproved, comment, this.currentUser!);
        this.notificationService.showSuccess('Décision enregistrée avec succès.');
        this.isConfirmationModalVisible = false;
        this.loadMissions();
      },
      error: (err) => {
        console.error(err);
        this.notificationService.showError("Erreur lors de l'enregistrement de la décision.");
      }
    });
  }
    

  onModalClose(): void {
    this.isConfirmationModalVisible = false;
    this.activeDecision = null;
  }
  isWorkersModalVisible = false;
  
  
viewWorkerDetails(mission: MissionRequest): void {
  const workers = Array.isArray(mission.workers) ? mission.workers : [];
  this.dialog.open(WorkersListModalComponent, {
    width: '500px',
    data: { workers },
    disableClose: false
  });
}

  
  closeWorkersModal(): void {
    this.isWorkersModalVisible = false;
    this.selectedWorkers = [];
  }
  

  private createDecisionAndNotify(mission: MissionRequest, isApproved: boolean, comment: string | null, currentUser: User): void {
    const decision = { approved: isApproved, comment: comment || '', decisionBy: currentUser, date: new Date() };
    this.decisionService.createDecision(decision).subscribe(() => {
      this.createNotification(mission, isApproved, true, currentUser);
    });
  }

  private createNotification(mission: MissionRequest, isApproved: boolean, isFinal: boolean, currentUser: User): void {
    const workers = Array.isArray(mission.workers) ? mission.workers : [];
    
    workers.forEach((w: any) => {
      // Get the full worker object or at least ensure we have proper structure
      const recipient = typeof w === 'object' ? w : { id: w };
      
      if (!recipient.id) {
        console.warn('Skipping notification: No recipient ID', w);
        return;
      }
  
      const notifMsg = this.createNotificationMessage(mission, isApproved, isFinal, currentUser.role, currentUser.name);
  
      const notification: Notification = {
        id: 0,
        recipient: recipient, // Send the full recipient object
        message: notifMsg,
        read: false,
        timestamp: new Date().toISOString()
      };
  
      console.log('Creating notification:', notification);
      
      this.notificationBackendService.createNotification(notification).subscribe({
        next: () => console.log('Notification sent successfully'),
        error: (error) => {
          console.error('Error sending notification:', error);
          this.notificationService.showError("Erreur lors de l'envoi de la notification");
        }
      });
    });
  }
  

  private createNotificationMessage(mission: MissionRequest, isApproved: boolean, isFinal: boolean, role: Role, adminName: string): string {
    const first = (mission as any)?.workers?.[0] || null;
    const fullName = first ? this.getWorkerName(first) : 'l’employé';
    const roleName = role === Role.ADMIN ? 'Directeur' : 'RH';
  
    if (!isApproved) {
      return `❌ L'ordre de mission pour ${fullName} à ${mission.destination} a été rejeté par ${roleName} (${adminName}).`;
    }
    return `✅ L'ordre de mission pour ${fullName} à ${mission.destination} a été approuvé.`;
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

  async generatePdf(mission: MissionRequest): Promise<void> {
  try {
    const { destination, missionDate, endDate, workers } = mission;
    const purpose = "mission professionnelle";

    if (!workers || workers.length === 0) {
      this.notificationService.showWarning("Aucun travailleur trouvé pour cette mission", "PDF non généré");
      return;
    }

    // --- Create PDF ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height, width } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Load logo
    const logoUrl = "assets/logo.png";
    const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.15); // Resize logo

    // Place logo top-left
    page.drawImage(logoImage, {
      x: 50,
      y: height - logoDims.height - 30,
      width: logoDims.width,
      height: logoDims.height
    });

    // Company name next to logo
    page.drawText("UNITED SERVICES", {
      x: 50 + logoDims.width + 10,
      y: height - 50,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    // Title centered
    page.drawText("ORDRE DE MISSION", {
      x: width / 2 - boldFont.widthOfTextAtSize("ORDRE DE MISSION", 18) / 2,
      y: height - 100,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    // Date right-aligned
    page.drawText(`Date: ${new Date().toLocaleDateString("fr-FR")}`, {
      x: width - 150,
      y: height - 130,
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });

    // Body text
    const bodyStartY = height - 170;
    const bodyLines = [
      "Monsieur,",
      "Nous soussignés UNITED SERVICES certifions par la présente que la liste de personnel",
      `mentionnée ci-dessous, se déplacera à ${destination} pour ${purpose},`,
      `à partir du ${new Date(missionDate).toLocaleDateString("fr-FR")} au ${new Date(endDate).toLocaleDateString("fr-FR")}.`
    ];

    bodyLines.forEach((line, i) => {
      page.drawText(line, {
        x: 50,
        y: bodyStartY - i * 18,
        size: 12,
        font: font,
        color: rgb(0, 0, 0)
      });
    });

    // Table
    const tableStartY = bodyStartY - bodyLines.length * 18 - 40;
    const rowHeight = 25;
    const colWidths = [160, 100, 140, 120];
    const headers = ["Nom & Prénom", "N° CIN", "Fonction", "Département"];
    const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);

    // Draw headers
    let x = 50;
    headers.forEach((h, i) => {
      page.drawText(h, {
        x: x + 5,
        y: tableStartY - 18,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      x += colWidths[i];
    });

    // Worker rows
    workers.forEach((worker, index) => {
      const rowY = tableStartY - 40 - index * rowHeight;
      x = 50;

      const values = [
        this.getWorkerName(worker) || "N/A",
        worker.cin || "N/A",
        this.getWorkerPosition(worker) || "N/A",
        worker.department || "N/A"
      ];

      values.forEach((val, i) => {
        page.drawText(String(val), {
          x: x + 5,
          y: rowY,
          size: 10,
          font: font,
          color: rgb(0, 0, 0)
        });
        x += colWidths[i];
      });
    });

    // Table borders
    for (let i = 0; i <= workers.length + 1; i++) {
      page.drawLine({
        start: { x: 50, y: tableStartY - i * rowHeight },
        end: { x: 50 + tableWidth, y: tableStartY - i * rowHeight },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
    }
    x = 50;
    for (let i = 0; i <= colWidths.length; i++) {
      page.drawLine({
        start: { x, y: tableStartY },
        end: { x, y: tableStartY - (workers.length + 1) * rowHeight },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      if (i < colWidths.length) x += colWidths[i];
    }

    // Signature
    const signatureY = tableStartY - (workers.length + 2) * rowHeight - 50;
    page.drawText("Meilleures Salutations,", {
      x: 50,
      y: signatureY,
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });

    page.drawText("Le Directeur Général", {
      x: width - 200,
      y: signatureY - 40,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    // Footer
    const footerLines = [
      "09 Rue de l'innovation zone industrielle EL AGBA-TUNIS",
      "Email : dzg@unitedservices.com.tn",
      "M.F : 1239567/N - RC : B3155712012 - RIB : 10 004 034 180921 4 788 88 STB Bab Souika"
    ];
    footerLines.forEach((line, i) => {
      page.drawText(line, {
        x: 50,
        y: 60 - i * 12,
        size: 9,
        font: font,
        color: rgb(0, 0, 0)
      });
    });

    // Save & download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);

    const workerLabel = workers.length > 0 ? this.getWorkerName(workers[0]).replace(/\s+/g, "_") : `mission_${new Date(missionDate).toISOString().split("T")[0]}`;

    link.download = `Ordre_de_Mission_${destination}_${missionDate}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.notificationService.showSuccess("PDF généré avec succès");
  } catch (err) {
    console.error("Error generating PDF:", err);
    this.notificationService.showError("Erreur lors de la génération du PDF");
  }
}
  openWorkerDetails(worker: Worker): void {
    this.selectedWorker = worker;
    this.isWorkerModalVisible = true;
  }

  closeWorkerModal(): void {
    this.isWorkerModalVisible = false;
    this.selectedWorker = null;
  }

}