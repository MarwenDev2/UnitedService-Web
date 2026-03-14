import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { User } from '../../models/User.model';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  // REPLACE WITH YOUR ACTUAL VAPID PUBLIC KEY from web-push generate-vapid-keys
  private readonly VAPID_PUBLIC_KEY = 'BJvnndHkawWKbjG7gm9K1GWg9VWhRfyDwzp4B5BkjhEqLw9OOPe5W5o81T8XrXLeZbjDAFIDOqIp403MAzKPNOU';

  public notificationPermission = new BehaviorSubject<NotificationPermission>('default');
  public isSubscribed = new BehaviorSubject<boolean>(false);
  public currentUser: User | null;

  constructor(private http: HttpClient, private authService: AuthService) {
    this.checkNotificationPermission();
    this.checkSubscription();
    this.setupMessageListener();
    this.currentUser = this.authService.getUser();
  }

  async registerServiceWorker(): Promise<boolean> {
    // This method is now handled in the component
    console.warn('registerServiceWorker() is deprecated. Use component registration instead.');
    
    // Just check if service worker exists
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      return !!registration;
    }
    return false;
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      // IMPORTANT: Notification.requestPermission() must be called from user gesture
      const permission = await Notification.requestPermission();
      this.notificationPermission.next(permission);
      
      console.log('Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(): Promise<PushSubscription | null> {
    try {
      console.log('Starting push subscription process...');
      
      // 1. Get service worker registration (assumes already registered)
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker ready:', registration);

      // 2. Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        console.log('Already subscribed:', subscription);
        this.isSubscribed.next(true);
        return subscription;
      }

      // 3. Request permission if not already granted
      if (Notification.permission !== 'granted') {
        const granted = await this.requestPermission();
        if (!granted) {
          throw new Error('Notification permission denied');
        }
      }

      // 4. Convert VAPID key to ArrayBuffer
      const applicationServerKey = this.convertVapidKeyToArrayBuffer(this.VAPID_PUBLIC_KEY);

      // 5. Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('✅ Push subscription successful:', subscription);

      // 6. Send to backend
      await this.sendSubscriptionToServer(subscription);
      this.isSubscribed.next(true);

      return subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      this.isSubscribed.next(false);
      return null;
    }
  }

  // Helper function to convert VAPID key - FIXED VERSION
  public convertVapidKeyToArrayBuffer(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    // Return the ArrayBuffer, not the Uint8Array
    return outputArray.buffer;
  }

  // Alternative: Use string directly (some browsers support this)
  public getVapidKeyAsString(): string {
    return this.VAPID_PUBLIC_KEY;
  }

  // Alternative subscription method using string key
  async subscribeToPushWithStringKey(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.VAPID_PUBLIC_KEY // Use string directly
      });

      console.log('✅ Push subscription successful (string key):', subscription);
      return subscription;
    } catch (error) {
      console.error('❌ Push subscription with string key failed:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscriptionFromServer(subscription);
        this.isSubscribed.next(false);
        console.log('✅ Successfully unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error unsubscribing from notifications:', error);
      return false;
    }
  }

  // Send subscription to backend
  public async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const payload = {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        userId: this.getCurrentUserId()
      };

      console.log('Sending subscription to server:', payload);
      
      await this.http.post('/api/push-notifications/subscribe', payload).toPromise();
      console.log('✅ Subscription sent to server');
    } catch (error: any) {
      console.error('❌ Failed to send subscription to server:', error);
      // Don't throw - allow subscription to continue even if backend fails
    }
  }

  // Remove subscription from backend
  public async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await this.http.post('/api/push-notifications/unsubscribe', {
        subscription: subscription
      }).toPromise();
      console.log('✅ Subscription removed from server');
    } catch (error: any) {
      console.error('❌ Error removing subscription from server:', error);
    }
  }

  // Check current subscription
  public async checkSubscription(): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        this.isSubscribed.next(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  }

  // Check notification permission
  public checkNotificationPermission(): void {
    if ('Notification' in window) {
      this.notificationPermission.next(Notification.permission);
    }
  }

  // Setup message listener
  public setupMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from service worker:', event.data);
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          this.handleNotificationAction(event.data.data);
        }
      });
    }
  }

  public handleNotificationAction(data: any): void {
    console.log('Notification action received:', data);
    // Navigate based on notification data
    if (data.url) {
      window.location.href = data.url;
    }
  }

  // Get current user ID
  public getCurrentUserId(): number {
    return this.authService.getUser()?.id || 1;
  }

  // ========== NOTIFICATION SENDING METHODS ==========

  // Send test notification
  async sendTestNotification(): Promise<void> {
    try {
      await this.http.post('/api/push-notifications/test', {}).toPromise();
      console.log('✅ Test notification sent');
    } catch (error: any) {
      console.error('❌ Error sending test notification:', error);
    }
  }

  // Send custom notification
  async sendCustomNotification(title: string, body: string, type: string, data?: any): Promise<void> {
    try {
      await this.http.post('/api/push-notifications/send', {
        title: title,
        body: body,
        type: type,
        data: data,
        userId: this.getCurrentUserId()
      }).toPromise();
      console.log('✅ Custom notification sent:', title);
    } catch (error: any) {
      console.error('❌ Error sending custom notification:', error);
    }
  }

  // Test if push is working
  async testPushNotification(): Promise<boolean> {
    try {
      // Try subscription first
      const subscription = await this.subscribeToPush();
      
      if (!subscription) {
        console.warn('Not subscribed to push');
        return false;
      }

      // Send test notification
      await this.sendTestNotification();
      
      return true;
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      return false;
    }
  }

  // Convenience methods for different notification types
  async notifyLeaveRequest(employeeName: string, status: string): Promise<void> {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    await this.sendCustomNotification(
      `Leave Request ${statusText}`,
      `Leave request for ${employeeName} has been ${status}`,
      'leave_request',
      {
        url: '/conges',
        status,
        timestamp: new Date().toISOString()
      }
    );
  }

  async notifyMissionUpdate(missionTitle: string, action: string): Promise<void> {
    const actionText = action.charAt(0).toUpperCase() + action.slice(1);
    await this.sendCustomNotification(
      `Mission ${actionText}`,
      `Mission "${missionTitle}" has been ${action}`,
      'mission',
      {
        url: '/missions',
        action,
        timestamp: new Date().toISOString()
      }
    );
  }

  async notifyAdvanceRequest(amount: string, status: string): Promise<void> {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    await this.sendCustomNotification(
      `Advance Request ${statusText}`,
      `Your advance request of ${amount} has been ${status}`,
      'advance',
      {
        url: '/advances',
        status,
        amount,
        timestamp: new Date().toISOString()
      }
    );
  }

  async notifySystemMessage(title: string, message: string, type: string): Promise<void> {
    await this.sendCustomNotification(
      title,
      message,
      `system_${type}`,
      {
        type,
        timestamp: new Date().toISOString()
      }
    );
  }
}