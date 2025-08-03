import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class Sidebar implements OnInit, OnDestroy {
  isUserSubmenuOpen = false;
  isCollapsed = false;
  private layoutSubscription: Subscription;
  currentRoute: string = '';

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private layoutService: LayoutService
  ) {
    this.layoutSubscription = this.layoutService.isCollapsed$.subscribe(
      (collapsed: boolean) => (this.isCollapsed = collapsed)
    );
  }

  ngOnInit(): void {
    this.updateCurrentRoute();
    
    // Subscribe to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateCurrentRoute();
    });
  }

  updateCurrentRoute(): void {
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.currentRoute = route.snapshot.routeConfig?.path || '';
  }

  isActive(routeSegment: string): boolean {
    return this.currentRoute.includes(routeSegment);
  }

  toggleUserSubmenu(event: MouseEvent): void {
    event.preventDefault();
    this.isUserSubmenuOpen = !this.isUserSubmenuOpen;
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