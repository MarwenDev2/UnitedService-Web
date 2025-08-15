import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WorkerService } from '../../core/services/worker.service';
import { DemandeAvanceService } from '../../core/services/demande-avance.service';
import { NotificationService } from '../../core/services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Worker } from '../../models/Worker.model';

@Component({
  selector: 'app-demande-avance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './demande-avance.html',
  styleUrls: ['./demande-avance.scss']
})
export class DemandeAvanceComponent {
  demande = {
    cin: '',
    requestedAmount: null as number | null
  };
  workerName: string | null = null;
  cinError: string | null = null;
  workerId: number | null = null;
  workerSalary: number | null = null;
  isPastDeadline = false;

  constructor(
    private demandeAvanceService: DemandeAvanceService,
    private workerService: WorkerService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.checkDeadline();
  }

  private checkDeadline(): void {
    const today = new Date();
    this.isPastDeadline = today.getDate() > 15;
  }

  onCinChange(): void {
    this.workerName = null;
    this.cinError = null;
    this.workerId = null;
    this.workerSalary = null;

    if (this.demande.cin && this.demande.cin.length >= 7) {
      this.workerService.getWorkerByCin(this.demande.cin).subscribe({
        next: (worker: Worker) => {
          this.workerName = worker.name;
          this.workerId = worker.id;
          this.workerSalary = worker.salary || 0;
          this.cinError = null;
        },
        error: () => {
          this.cinError = 'CIN incorrect ou non trouvé.';
          this.workerSalary = null;
        }
      });
    }
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      this.notificationService.showError('Veuillez remplir tous les champs requis.');
      return;
    }

    if (!this.workerId) {
      this.notificationService.showError('Veuillez entrer un CIN valide avant de soumettre.');
      return;
    }

    // Check if past deadline (15th of the month)
    if (this.isPastDeadline) {
      this.notificationService.showError('Les demandes d\'avance ne sont plus acceptées après le 15 de chaque mois.');
      return;
    }

    // Check if requested amount is valid and less than or equal to salary
    const requestedAmount = this.demande.requestedAmount || 0;
    if (requestedAmount <= 0) {
      this.notificationService.showError('Le montant demandé doit être supérieur à 0.');
      return;
    }

    if (this.workerSalary !== null && requestedAmount > this.workerSalary) {
      this.notificationService.showError('Le montant demandé ne peut pas dépasser le salaire du travailleur.');
      return;
    }

    this.demandeAvanceService.createDemandeAvance(this.workerId, requestedAmount).subscribe({
      next: () => {
        this.notificationService.showSuccess('Demande d\'avance soumise avec succès.');
        this.router.navigate(['/avances-management']);
      },
      error: (err: any) => {
        const errorMessage = err?.error?.message || 'Erreur lors de la soumission de la demande.';
        this.notificationService.showError(errorMessage);
        console.error(err);
      }
    });
  }
}
