import { Routes } from '@angular/router';
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
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(c => c.DashboardComponent),
        canActivate: [AuthGuard],
      },
      {
        path: 'conges',
        loadComponent: () => import('./features/conges-management/conges-management').then(c => c.CongesManagement),
        canActivate: [AuthGuard],
      },
      {
        path: 'workers',
        loadComponent: () => import('./features/workers-list/workers-list').then(c => c.WorkersListComponent),
        canActivate: [AuthGuard],
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];

