import { Component, HostListener, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/User.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class Navbar implements OnInit {
  @Input() isCollapsed = false;
  private authService = inject(AuthService);
  user$: Observable<User | null> = this.authService.user$;

  constructor() { }

  ngOnInit(): void {
  }
  
  // Menu states
  showUserMenu = false;
  
  // Mock data
  unreadNotifications = 0;
  
  // Toggle user menu
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout(): void {
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