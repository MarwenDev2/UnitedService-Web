import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartType, PieController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { map } from 'rxjs/operators';
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
      this.isLoading = false;
    });
  }

  loadStatusStats() {
    const statusMap = {
      'Acceptées': [Status.ACCEPTE],
      'En attente': [Status.EN_ATTENTE_RH, Status.EN_ATTENTE_ADMIN],
      'Refusées': [Status.REFUSE_RH, Status.REFUSE_ADMIN]
    };

    const labels = Object.keys(statusMap);
    const observables = labels.map(label => {
      const statuses = statusMap[label as keyof typeof statusMap];
      const statusObservables = statuses.map(status => this.congeService.countByStatus(status));
      return forkJoin(statusObservables).pipe(
        map((counts: number[]) => counts.reduce((acc: number, count: number) => acc + count, 0))
      );
    });

    forkJoin(observables).subscribe((data: number[]) => {
      this.updateStatusChart(labels, data);
    });
  }

  loadTypeStats() {
    const types = Object.values(TypeConge);
    const observables = types.map(type => this.congeService.countByType(type));

    forkJoin(observables).subscribe((counts: number[]) => {
      const labels: string[] = [];
      const data: number[] = [];
      counts.forEach((count, index) => {
        if (count > 0) {
          labels.push(types[index]);
          data.push(count);
        }
      });
      this.updateTypeChart(labels, data);
    });
  }

  loadMonthlyStats() {
    const currentYear = new Date().getFullYear();
    this.monthlyChartOptions!.plugins!.title!.text = `Évolution Mensuelle ${currentYear}`;

    const labels = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const observables = Array.from({ length: 12 }, (_, i) => this.congeService.countByMonth(i + 1, currentYear));

    forkJoin(observables).subscribe((data: number[]) => {
      this.updateMonthlyChart(labels, data);
    });
  }

  updateStatusChart(labels: string[], data: number[]) {
    this.statusChartData = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#4CAF50', '#FFC107', '#F44336'], // Green, Amber, Red
        borderWidth: 1
      }]
    };
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
