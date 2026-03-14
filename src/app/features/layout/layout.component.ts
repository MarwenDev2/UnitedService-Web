import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LayoutService } from './layout.service';
import { Sidebar } from './sidebar/sidebar';
import { Navbar } from './navbar/navbar';
import { PushNotificationService } from '../../core/services/push-notification.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar, Navbar],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  private layoutSubscription: Subscription;
  showNotificationPrompt = false;
  hasCheckedPermission = false;
  private permissionCheckInterval: any;

  constructor(private layoutService: LayoutService, private pushService: PushNotificationService) {
    this.layoutSubscription = this.layoutService.isCollapsed$.subscribe(
      (collapsed) => {
        this.isCollapsed = collapsed;
      }
    );
  }

  ngOnInit() {
    this.checkNotificationPermission();
    
    // Check periodically if we should show the prompt
    this.permissionCheckInterval = setInterval(() => {
      this.checkNotificationPermission();
    }, 30000); // Check every 30 seconds
  }

  ngOnDestroy(): void {
    if (this.layoutSubscription) {
      this.layoutSubscription.unsubscribe();
    }
    if (this.permissionCheckInterval) {
      clearInterval(this.permissionCheckInterval);
    }
  }

   private checkNotificationPermission(): void {
    // Don't show if already checked or if notifications aren't supported
    if (this.hasCheckedPermission || !('Notification' in window)) {
      return;
    }

    const permission = Notification.permission;
    
    // Only show prompt if permission is 'default' (not yet asked)
    // and if we haven't shown it before
    if (permission === 'default') {
      // Wait a bit before showing to not interrupt initial page load
      setTimeout(() => {
        this.showNotificationPrompt = true;
        this.hasCheckedPermission = true;
      }, 3000); // Show after 3 seconds
    } else {
      this.hasCheckedPermission = true;
    }
  }

  async enableNotifications(): Promise<void> {
    try {
      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return;
      }

      // Request permission directly (AppComponent already handles service worker)
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Permission granted from layout prompt');
        
        // Instead of registering service worker here, trigger AppComponent's flow
        // You have a few options:
        
        // Option A: Show success and let AppComponent handle subscription
        this.showSuccessMessage();
        
        // Option B: Manually trigger subscription
        setTimeout(() => {
          // This assumes pushService is available globally
          this.pushService.subscribeToPush().then(() => {
            console.log('Subscription completed from layout prompt');
          });
        }, 1000);
      }
      
      // Hide prompt regardless of result
      this.showNotificationPrompt = false;
      
    } catch (error) {
      console.error('Error enabling notifications:', error);
      this.showNotificationPrompt = false;
    }
  }

  dismissPrompt(): void {
    this.showNotificationPrompt = false;
    this.hasCheckedPermission = true;
    
    // Optionally save to localStorage to not ask again
    localStorage.setItem('notificationPromptDismissed', 'true');
  }

  private showSuccessMessage(): void {
    // You can implement a toast/snackbar here
    console.log('Notifications enabled!');
    // Or trigger a toast service
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
