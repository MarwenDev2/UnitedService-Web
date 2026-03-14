import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { PushNotificationService } from './core/services/push-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit {
  title = 'UnitedService';
  private hasRequestedPermission = false;

  constructor(
    private pushService: PushNotificationService, 
    private authService: AuthService
  ) {
    this.authService.initAuthState();
  }

  ngOnInit() {
    // Only call ONE service worker registration method
    this.initializePushNotifications();

    this.setupNotificationFocusHandling(); 

    console.log('🔐 Auth status on app start:', {
      isAuthenticated: this.authService.isAuthenticated,
      rememberMe: this.authService.isRememberMeEnabled(),
      user: this.authService.getUser()
    });
  }


  @HostListener('window:mousedown')
  @HostListener('window:keydown')
  @HostListener('window:touchstart')
  onUserActivity() {
    this.authService.updateSessionActivity();
  }

  private setupNotificationFocusHandling(): void {
    // Detect when page becomes visible/hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 Page is hidden - notifications should show');
      } else {
        console.log('📱 Page is visible - notifications might be suppressed');
      }
    });

    // Listen for focus/blur
    window.addEventListener('focus', () => {
      console.log('🎯 Window focused');
      this.showNotificationHint();
    });

    window.addEventListener('blur', () => {
      console.log('🎯 Window blurred');
    });
  }

  private showNotificationHint(): void {
    // Show a hint when window is focused and notifications might be suppressed
    if (Notification.permission === 'granted' && document.hasFocus()) {
      console.log('💡 Tip: Notifications work better when browser is minimized or in background');
      
      // Optionally show a toast message
      setTimeout(() => {
        // You can show a subtle hint to the user
        const shouldShowHint = localStorage.getItem('showNotificationHint') !== 'false';
        if (shouldShowHint) {
          console.log('🔔 Notifications appear when browser is minimized');
          // You could show a toast message here
        }
      }, 2000);
    }
  }
  
  private async initializePushNotifications(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      // Clean up old service workers first
      await this.cleanupOldServiceWorkers();
      
      // Register custom service worker
      const registration = await this.registerCustomServiceWorker();
      
      if (registration) {
        console.log('✅ Service worker registered successfully');
        
        // Check push subscription
        await this.checkAndSubscribe(registration);
      }
    } catch (error) {
      console.error('Push notification initialization error:', error);
    }
  }

  private async cleanupOldServiceWorkers(): Promise<void> {
    try {
      console.log('🧹 Cleaning up old service workers...');
      
      // Get ALL registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service workers`);
      
      // Unregister ALL of them
      await Promise.all(registrations.map(reg => {
        console.log('Unregistering:', reg.scope);
        return reg.unregister();
      }));
      
      // Clear ALL caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`Clearing ${cacheNames.length} caches`);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear IndexedDB if needed
      if ('indexedDB' in window) {
        const dbs = await indexedDB.databases();
        console.log(`Found ${dbs.length} IndexedDB databases`);
      }
      
      // Force a hard reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  }

  private async registerCustomServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      console.log('Registering custom service worker...');
      
      const registration = await navigator.serviceWorker.register('/custom-sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('✅ Custom service worker registered');

      // Wait for activation
      if (registration.installing) {
        await new Promise<void>((resolve, reject) => {
          const installingWorker = registration.installing!;
          
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'activated') {
              console.log('✅ Service worker activated');
              resolve();
            } else if (installingWorker.state === 'redundant') {
              reject(new Error('Service worker installation failed'));
            }
          });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            reject(new Error('Service worker activation timeout'));
          }, 10000);
        });
      }

      return registration;
    } catch (error) {
      console.error('❌ Failed to register custom service worker:', error);
      return null;
    }
  }

  private async checkAndSubscribe(registration: ServiceWorkerRegistration): Promise<void> {
    try {
      // Check existing subscription
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('✅ Already subscribed to push notifications');
        console.log('Endpoint:', subscription.endpoint);
        this.pushService.isSubscribed.next(true);
        
        // Send subscription to backend (in case it's not there)
        await this.pushService.sendSubscriptionToServer(subscription);
      } else if (Notification.permission === 'granted') {
        // Auto-subscribe if permission already granted
        console.log('Permission granted but not subscribed. Auto-subscribing...');
        await this.pushService.subscribeToPush();
      } else if (Notification.permission === 'default') {
        console.log('Push notifications not yet granted. Will request when needed.');
      } else {
        console.log('Push notifications denied by user');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }

  // Keep this method for UI button clicks
  async requestNotificationPermission(): Promise<void> {
    if (this.hasRequestedPermission) return;
    
    try {
      this.hasRequestedPermission = true;
      const isGranted = await this.pushService.requestPermission();
      
      if (isGranted === true) {  // Compare with boolean, not string
        await this.pushService.subscribeToPush();
        console.log('Notifications enabled successfully');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      this.hasRequestedPermission = false;
    }
  }
}