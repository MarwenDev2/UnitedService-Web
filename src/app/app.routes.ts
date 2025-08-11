import { Routes } from '@angular/router';
import { Role } from './models/Role.enum';
import { LayoutComponent } from './features/layout/layout.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(c => c.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(c => c.DashboardComponent),
      },
      {
        path: 'conges',
        loadComponent: () => import('./features/conges-management/conges-management').then(c => c.CongesManagement),
      },
      {
        path: 'workers',
        loadComponent: () => import('./features/workers-list/workers-list').then(c => c.WorkersListComponent),
      },
      {
        path: 'add-worker',
        loadComponent: () => import('./features/add-worker/add-worker.component').then(c => c.AddWorkerComponent),
      },
      {
        path: 'request-leave',
        loadComponent: () => import('./features/request-leave/request-leave').then(c => c.RequestLeave),
      },
      {
        path: 'mission-request',
        loadComponent: () => import('./features/mission-request/mission-request').then(c => c.MissionRequest),
      },
            {
        path: 'missions',
        loadComponent: () => import('./features/mission-management/mission-management').then(c => c.MissionManagementComponent),
      },
      {
        path: 'demande-avance',
        loadComponent: () => import('./features/demande-avance/demande-avance').then(m => m.DemandeAvanceComponent),
        canActivate: [AuthGuard],
        data: { roles: [Role.SECRETAIRE] }
      },
      {
        path: 'avances-management',
        loadComponent: () => import('./features/demande-avance-management/demande-avance-management').then(m => m.DemandeAvanceManagementComponent),
        canActivate: [AuthGuard],
        data: { roles: [Role.ADMIN] }
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];