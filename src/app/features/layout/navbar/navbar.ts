import { Component, HostListener, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class Navbar implements OnInit {
  @Input() isCollapsed = false;

  constructor() { }

  ngOnInit(): void {
  }
  
  // User information
  userName = 'Bob Martin';
  userRole = 'Ressources Humaines';
  
  // Menu states
  showUserMenu = false;
  
  // Mock data
  unreadNotifications = 0;
  
  // Toggle user menu
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
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