import { Component, HostListener, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, Observable, Subject } from 'rxjs';

import { NotificationBackendService } from '../../../core/services/notification-backend.service';
import { Notification } from '../../../models/Notification.model';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/User.model';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Role } from '../../../models/Role.enum';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  animations: [
    trigger('pulse', [
      state('initial', style({ transform: 'scale(1)' })),
      state('pulsing', style({ transform: 'scale(1.1)' })),
      transition('initial <=> pulsing', animate('200ms ease-in-out')),
    ]),
    trigger('fadeInOut', [
      state('in', style({ opacity: 1, transform: 'translateY(0)' })),
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out')
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class Navbar implements OnInit, OnDestroy {
  @Input() isCollapsed: boolean = false;

  // Notification properties
  isPopupVisible = false;
  notifications: Notification[] = [];
  unreadCount = 0;
  pulseState = 'initial';

  private notificationService = inject(NotificationBackendService);
  private refreshInterval: any;

  // Auth properties
  private authService = inject(AuthService);
  user$: Observable<User | null> = this.authService.user$;

  // Menu states
  showUserMenu = false;

  // Search properties
  searchQuery = '';
  searchResults: {path: string, title: string}[] = [];
  showSearchResults = false;
  private searchSubject = new Subject<string>();

  constructor(private router: Router) {
    const user = this.authService.getUser();
    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.search(query);
    });
  }

  // Search methods
  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  search(query: string): void {
    if (!query.trim()) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }
  
    // Define all possible routes with their required roles
    const allRoutes = [
      // Available to all roles
      { path: '/dashboard', title: 'Tableau de Bord', roles: [Role.SECRETAIRE, Role.RH, Role.ADMIN] },
      
      // Only for SECRETAIRE
      { path: '/request-leave', title: 'Postuler une demande de congé', roles: [Role.SECRETAIRE] },
      { path: '/mission-request', title: 'Postuler une ordre de mission', roles: [Role.SECRETAIRE] },
      { path: '/demande-avance', title: 'Postuler une demande d\'avance', roles: [Role.SECRETAIRE] },
      
      // Available to all roles (management views)
      { path: '/conges', title: 'Gestion des congés', roles: [Role.SECRETAIRE, Role.RH, Role.ADMIN] },
      { path: '/avances-management', title: 'Gestion des avances', roles: [Role.SECRETAIRE, Role.RH, Role.ADMIN] },
      { path: '/missions', title: 'Gestion des missions', roles: [Role.SECRETAIRE, Role.RH, Role.ADMIN] },
      
      // For RH and ADMIN
      { path: '/workers', title: 'Gestion des Employés', roles: [Role.RH, Role.ADMIN] },
      
      // Only for RH
      { path: '/add-worker', title: 'Ajouter Employé', roles: [Role.RH] }
    ];
  
    // Get current user's role
    const currentUser = this.authService.getUser();
    const currentRole = currentUser?.role;
  
    // Filter routes based on search query and user role
    this.searchResults = allRoutes.filter(route => {
      const matchesSearch = route.title.toLowerCase().includes(query.toLowerCase());
      const hasPermission = currentRole ? route.roles.includes(currentRole) : false;
      return matchesSearch && hasPermission;
    });
  
    this.showSearchResults = this.searchResults.length > 0;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
    this.showSearchResults = false;
    this.searchQuery = '';
  }


  ngOnInit(): void {
    this.updateNotificationBadge();
    this.setupNotificationRefresh();
  }

  
  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // Notification methods
  setupNotificationRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.updateNotificationBadge();
    }, 30000); // Refresh every 30 seconds
  }

  updateNotificationBadge(): void {
        this.notificationService.getUnreadCount().subscribe(count => {
      console.log('Unread count from backend:', count); 
      const newCount = count;
      if (newCount > this.unreadCount) {
        this.pulseState = 'pulsing';
        setTimeout(() => this.pulseState = 'initial', 400);
      }
      this.unreadCount = newCount;
    });
  }

  toggleNotifications(): void {
    this.isPopupVisible = !this.isPopupVisible;
    if (this.isPopupVisible) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe(data => {
      this.notifications = data;
    });
  }

  markAsRead(notification: Notification, event: MouseEvent): void {
    event.stopPropagation();
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.read = true;
        this.updateNotificationBadge();
      });
    }
  }

  // Other methods
  @HostListener('window:resize', ['$event'])
  onWindowResize(event: Event) { }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    this.authService.logout();
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    const target = event.target as HTMLElement;

    // Close search results when clicking outside
    if (!target.closest('.search-bar') && !target.closest('.search-results')) {
      this.showSearchResults = false;
    }

    if (!target.closest('.nav-item')) {
      this.showUserMenu = false;
    }
  }
  
  // Close dropdown when pressing Escape
  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: Event) {
    this.showUserMenu = false;
  }
}