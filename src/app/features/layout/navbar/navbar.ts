import { Component, HostListener, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { NotificationBackendService } from '../../../core/services/notification-backend.service';
import { Notification } from '../../../models/Notification.model';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/User.model';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  standalone: true,
  imports: [CommonModule],
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

  constructor() { }

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