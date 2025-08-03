import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CongeService } from '../../core/services/conge';
import { UserService } from '../../core/services/user.service';
import { Status, DemandeConge } from '../../models/conge.model';
import { User } from '../../models/User.model';

export interface Activity {
  id: number;
  type: 'leave' | 'user' | 'system' | 'approval';
  text: string;
  time: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
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

  // Upcoming Holidays
  upcomingHolidays: Holiday[] = [
    { id: 1, name: 'Nouvel An', date: new Date('2025-01-01') },
    { id: 2, name: 'Fête de la Révolution', date: new Date('2025-01-14') },
    { id: 3, name: 'Fête de l\'Indépendance', date: new Date('2025-03-20') },
    { id: 4, name: 'Fête du Travail', date: new Date('2025-05-01') },
    { id: 5, name: 'Fête de la République', date: new Date('2025-07-25') }
  ];

  constructor(
    private congeService: CongeService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
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

  getDaysUntil(date: Date): number {
    const today = new Date();
    const targetDate = new Date(date);
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
