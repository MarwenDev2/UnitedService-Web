import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartType, PieController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { CongeService } from '../../core/services/conge.service';
import { animate, AnimationBuilder, style } from '@angular/animations';
import { Status } from '../../models/Status.enum';
import { TypeConge } from '../../models/TypeConge.enum';

@Component({
  selector: 'app-admin-statistics',
  standalone: true,
    imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, BaseChartDirective],
  templateUrl: './admin-statistics.html',
  styleUrl: './admin-statistics.scss'
})
export class AdminStatistics implements OnInit {
  totalDemandes: number = 0;
  isLoading: boolean = true;
  statusChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
  typeChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
  monthlyChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };

  statusChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Statut des Demandes' }
    },
    animation: { duration: 1000, easing: 'easeInOutQuad' }
  };

  typeChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Types de Congés' }
    },
    animation: { duration: 1000, easing: 'easeInOutQuad' }
  };

  monthlyChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Évolution Mensuelle' }
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Nombre' } },
      x: { title: { display: true, text: 'Mois' } }
    },
    animation: { duration: 1000, easing: 'easeInOutQuad' }
  };

    constructor(private congeService: CongeService, private animationBuilder: AnimationBuilder) {
    Chart.register(PieController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);
  }

  ngOnInit() {
    this.loadStatistics();
  }

  loadStatistics() {
    this.isLoading = true;
    this.congeService.countAll().subscribe(total => {
      this.totalDemandes = total;
      this.loadStatusStats();
      this.loadTypeStats();
      this.loadMonthlyStats();
    });
  }

  loadStatusStats() {
    const statuses = [Status.ACCEPTE, Status.EN_ATTENTE_RH, Status.EN_ATTENTE_ADMIN, Status.REFUSE_RH, Status.REFUSE_ADMIN];
    const labels: string[] = [];
    const data: number[] = [];

    statuses.forEach(status => {
      this.congeService.countByStatus(status).subscribe(count => {
        if (count > 0) {
          labels.push(status === Status.ACCEPTE ? 'Acceptées' : 
                     status === Status.REFUSE_RH || status === Status.REFUSE_ADMIN ? 'Refusées' : 'En attente');
          data.push(count);
          this.updateStatusChart(labels, data);
        }
      });
    });
  }

  loadTypeStats() {
    const types = [TypeConge.ANNUEL, TypeConge.MALADIE, TypeConge.MATERNITE, TypeConge.SANS_SOLDE, TypeConge.AUTRE];
    const labels: string[] = [];
    const data: number[] = [];

    types.forEach(type => {
      this.congeService.countByType(type).subscribe(count => {
        if (count > 0) {
          labels.push(type);
          data.push(count);
          this.updateTypeChart(labels, data);
        }
      });
    });
  }

  loadMonthlyStats() {
    const labels: string[] = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const data: number[] = [];

    for (let i = 1; i <= 12; i++) {
      this.congeService.countByMonth(i).subscribe(count => {
        data.push(count);
        this.updateMonthlyChart(labels, data);
      });
    }
  }

  updateStatusChart(labels: string[], data: number[]) {
    this.statusChartData = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#4CAF50', '#FF9800', '#F44336'],
        borderWidth: 1
      }]
    };
    this.isLoading = false;
  }

  updateTypeChart(labels: string[], data: number[]) {
    this.typeChartData = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#2196F3', '#9C27B0', '#FFEB3B', '#795548', '#607D8B'],
        borderWidth: 1
      }]
    };
  }

  updateMonthlyChart(labels: string[], data: number[]) {
    this.monthlyChartData = {
      labels: labels,
      datasets: [{
        label: 'Demandes par mois',
        data: data,
        backgroundColor: '#4CAF50',
        borderColor: '#45a049',
        borderWidth: 1
      }]
    };
  }
}
