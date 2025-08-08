import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CongeService } from '../../core/services/conge.service';
import { UserService } from '../../core/services/user.service';
import { DemandeConge } from '../../models/DemandeConge.model';
import { Status } from '../../models/Status.enum';
import { User } from '../../models/User.model';
import { AuthService } from '../../core/services/auth.service';
import { AdminStatistics } from '../admin-statistics/admin-statistics';

export interface Activity {
  id: number;
  type: 'leave' | 'user' | 'system' | 'approval';
  text: string;
  time: string;
}



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminStatistics],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  userName = 'Admin'; // Will be replaced by actual logged-in user

  // Stats
  pendingRequests = 0;
  acceptedRequests = 0;
  rejectedRequests = 0;
  users = 0;

  // Recent Activities
  recentActivities: Activity[] = [];

  constructor(
    private congeService: CongeService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.currentUserValue?.role || '' ;
    this.loadStats();
    this.loadRecentActivities();
  }

  loadStats(): void {
    const pending$ = this.congeService.countByStatus(Status.EN_ATTENTE_RH).pipe(
      catchError(() => of(0))
    );

    const accepted$ = this.congeService.countByStatus(Status.ACCEPTE).pipe(catchError(() => of(0)));

    const rejected$ = this.congeService.countByStatus(Status.REFUSE_RH).pipe(
      catchError(() => of(0))
    );

    const users$ = this.userService.getUsers().pipe(map((users: User[]) => users.length), catchError(() => of(0)));

    forkJoin({
      pending: pending$,
      accepted: accepted$,
      rejected: rejected$,
      users: users$
    }).subscribe(stats => {
      this.pendingRequests = stats.pending;
      this.acceptedRequests = stats.accepted;
      this.rejectedRequests = stats.rejected;
      if (typeof stats.users === 'number') {
        this.users = stats.users;
      }
    });
  }

  loadRecentActivities(): void {
    this.congeService.getAllDemandes().pipe(
      map((demandes: DemandeConge[]) => demandes
        .sort((a: DemandeConge, b: DemandeConge) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .slice(0, 5) // Get latest 5
      ),
      catchError(() => of([]))
    ).subscribe((recentDemandes: DemandeConge[]) => {
      this.recentActivities = recentDemandes.map((demande: DemandeConge) => ({
        id: demande.id,
        type: 'leave',
        text: this.buildNotificationMessage(demande),
        time: this.getRelativeTime(new Date(demande.startDate))
      }));
    });
  }

  private buildNotificationMessage(demande: DemandeConge): string {
    const workerName = demande.worker?.name || 'Un employé';
    switch (demande.status) {
        case Status.ACCEPTE: return `La demande de congé de ${workerName} a été approuvée.`;
        case Status.REFUSE_RH: return `La demande de congé de ${workerName} a été refusée par le RH.`;
        case Status.REFUSE_ADMIN: return `La demande de congé de ${workerName} a été refusée par le Directeur.`;
        case Status.EN_ATTENTE_ADMIN: return `La demande de congé de ${workerName} est en attente de validation.`;
        default: return `Mise à jour de la demande de congé de ${workerName}.`;
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'leave': return 'fas fa-file-alt';
      case 'user': return 'fas fa-user-plus';
      case 'system': return 'fas fa-cogs';
      case 'approval': return 'fas fa-check-double';
      default: return 'fas fa-info-circle';
    }
  }

  getActivityIconClass(type: string): string {
    switch (type) {
      case 'leave': return 'leave';
      case 'user': return 'user';
      case 'system': return 'system';
      case 'approval': return 'approval';
      default: return '';
    }
  }



  getRelativeTime(date: Date): string {
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `Il y a quelques secondes`;
    if (minutes < 60) return `Il y a ${minutes} minutes`;
    if (hours < 24) return `Il y a ${hours} heures`;
    return `Il y a ${days} jours`;
  }
}
