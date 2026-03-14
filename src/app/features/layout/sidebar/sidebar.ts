import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LayoutService } from '../layout.service';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../models/Role.enum';
import { User } from '../../../models/User.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class Sidebar implements OnInit, OnDestroy {
  isSecretaire = false;
  isAdmin = false;
  isRh = false;
  isUserSubmenuOpen = false;
  salaryAdvanceMenuOpen = false;
  isCollapsed = false;
  private layoutSubscription: Subscription;
  currentRoute: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private layoutService: LayoutService,
    private authService: AuthService
  ) {
    this.layoutSubscription = this.layoutService.isCollapsed$.subscribe(
      isCollapsed => this.isCollapsed = isCollapsed
    );
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.updateUserRoles(user);

    // Subscribe to route changes to set the current route and manage menu states
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
      // Keep the salary advance menu open if on a related page
      this.salaryAdvanceMenuOpen = this.currentRoute.includes('/demande-avance') || this.currentRoute.includes('/avances-management');
    });
  }

  private updateUserRoles(user: User | null): void {
    this.isSecretaire = user?.role === Role.SECRETAIRE;
    this.isAdmin = user?.role === Role.ADMIN;
    this.isRh = user?.role === Role.RH;
  }

  isActive(routeSegment: string): boolean {
    return this.currentRoute.includes(routeSegment);
  }

  toggleUserSubmenu(event: Event): void {
    event.preventDefault();
    this.isUserSubmenuOpen = !this.isUserSubmenuOpen;
  }

  toggleSalaryAdvanceMenu(event: Event): void {
    event.preventDefault();
    this.salaryAdvanceMenuOpen = !this.salaryAdvanceMenuOpen;
  }

  toggleCollapse(): void {
    this.layoutService.toggleSidebar();
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    // Close sidebar when clicking outside on mobile
    const target = event.target as HTMLElement;
    if (window.innerWidth <= 768 && !target.closest('.sidebar') && !this.isCollapsed) {
      this.layoutService.setSidebarState(true);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    // Handle responsive behavior
    if (window.innerWidth <= 768) {
      this.layoutService.setSidebarState(true);
    } else if (window.innerWidth > 992 && this.isCollapsed) {
      // This could be uncommented to automatically open the sidebar on larger screens
      // this.layoutService.setSidebarState(false);
    }
  }

  ngOnDestroy(): void {
    if (this.layoutSubscription) {
      this.layoutSubscription.unsubscribe();
    }
  }
}