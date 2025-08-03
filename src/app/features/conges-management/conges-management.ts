import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CongeService } from '../../core/services/conge';
import { DemandeConge, Status } from '../../models/conge.model';
import { Observable, forkJoin, map, of } from 'rxjs';

@Component({
  selector: 'app-conges-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conges-management.html',
  styleUrls: ['./conges-management.scss']
})
export class CongesManagement implements OnInit {

  demandes$: Observable<DemandeConge[]> = of([]);
  stats = {
    pending: 0,
    accepted: 0,
    refused: 0
  };

  statusOptions = Object.values(Status);
  selectedStatus: Status | 'TOUS' = 'TOUS';

  constructor(private congeService: CongeService) { }

  ngOnInit(): void {
    this.loadTableData();
    this.loadStats();
  }

  loadTableData(): void {
    this.demandes$ = this.congeService.getAllDemandes().pipe(
      map((demandes: DemandeConge[]) => {
        if (this.selectedStatus === 'TOUS') {
          return demandes;
        }
        return demandes.filter((d: DemandeConge) => d.status === this.selectedStatus);
      })
    );
  }

  loadStats(): void {
    forkJoin({
      pending: this.congeService.countByStatus(Status.EN_ATTENTE_RH),
      pendingAdmin: this.congeService.countByStatus(Status.EN_ATTENTE_ADMIN),
      accepted: this.congeService.countByStatus(Status.ACCEPTE),
      refused: this.congeService.countByStatus(Status.REFUSE_RH),
      refusedAdmin: this.congeService.countByStatus(Status.REFUSE_ADMIN)
    }).subscribe((results: { pending: number; pendingAdmin: number; accepted: number; refused: number; refusedAdmin: number; }) => {
      this.stats.pending = results.pending + results.pendingAdmin;
      this.stats.accepted = results.accepted;
      this.stats.refused = results.refused + results.refusedAdmin;
    });
  }

  handleApproval(demande: DemandeConge, isApproved: boolean): void {
    // This logic assumes a simplified workflow. 
    // You might need to adapt it based on the current user's role (RH vs. Admin).
    const role: string = 'ADMIN'; // Replace with actual user role from a session service

    let action: Observable<void>;

    if (role === 'RH' && demande.status === Status.EN_ATTENTE_RH) {
      action = this.congeService.updateRHStatus(demande.id, isApproved);
    } else if (role === 'ADMIN' && demande.status === Status.EN_ATTENTE_ADMIN) {
      action = this.congeService.finalApprove(demande.id, isApproved);
    } else {
      // For simplicity, allowing admin to handle all pending requests
      if (demande.status === Status.EN_ATTENTE_RH) {
         action = this.congeService.updateRHStatus(demande.id, isApproved);
      } else {
         action = this.congeService.finalApprove(demande.id, isApproved);
      }
    }

    action.subscribe(() => {
      this.loadTableData();
      this.loadStats();
      // Add notification logic here if needed
    });
  }

  calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  formatStatus(status: Status): string {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}
