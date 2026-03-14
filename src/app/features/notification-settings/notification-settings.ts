import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { PushNotificationService } from '../../core/services/push-notification.service';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div *ngIf="isVisible" class="modal-backdrop" (click)="close()">
      <!-- Modal Content -->
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3>
            <i class="fas fa-bell"></i>
            Notification Settings
          </h3>
          <button class="close-btn" (click)="close()" title="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <div class="setting-item">
            <label class="toggle-label">
              <input type="checkbox" 
                     [checked]="(isSubscribed$ | async) || false"
                     (change)="toggleNotifications($event)"
                     [disabled]="(permission$ | async) === 'denied'">
              <span class="toggle-slider"></span>
              <span class="toggle-text">Enable Push Notifications</span>
            </label>
            
            <div class="status-message">
              <span *ngIf="(permission$ | async) === 'denied'" class="text-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Permission denied. Please enable notifications in browser settings.
              </span>
              <span *ngIf="(permission$ | async) === 'granted' && (isSubscribed$ | async)" class="text-success">
                <i class="fas fa-check-circle"></i>
                Notifications enabled
              </span>
              <span *ngIf="(permission$ | async) === 'default'" class="text-info">
                <i class="fas fa-info-circle"></i>
                Notifications not configured
              </span>
            </div>
          </div>

          <div class="setting-item" *ngIf="(isSubscribed$ | async) && (permission$ | async) === 'granted'">
            <button (click)="sendTestNotification()" class="btn-test">
              <i class="fas fa-paper-plane"></i> Send Test Notification
            </button>
            <small class="help-text">Test if notifications are working on your device</small>
          </div>

          <div class="notification-types" *ngIf="(isSubscribed$ | async) && (permission$ | async) === 'granted'">
            <h4>Notification Preferences</h4>
            <p class="types-description">Choose which types of notifications you want to receive:</p>
            
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="settings.leaveRequests">
                <span class="checkmark"></span>
                <div class="checkbox-content">
                  <strong>Leave Requests</strong>
                  <small>Approvals, rejections, and status updates</small>
                </div>
              </label>
              
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="settings.missionRequests">
                <span class="checkmark"></span>
                <div class="checkbox-content">
                  <strong>Mission Orders</strong>
                  <small>New assignments and mission updates</small>
                </div>
              </label>
              
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="settings.advanceRequests">
                <span class="checkmark"></span>
                <div class="checkbox-content">
                  <strong>Salary Advances</strong>
                  <small>Advance request approvals and status</small>
                </div>
              </label>
              
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="settings.systemAlerts">
                <span class="checkmark"></span>
                <div class="checkbox-content">
                  <strong>System Alerts</strong>
                  <small>Important system announcements</small>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button class="btn-secondary" (click)="close()">Close</button>
          <button class="btn-primary" (click)="saveSettings()">Save Settings</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    }

    /* Modal Content */
    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
    }

    /* Modal Header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e9ecef;
      
      h3 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #333;
        font-size: 20px;
        
        i {
          color: #007bff;
        }
      }
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: #6c757d;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: all 0.2s;
      
      &:hover {
        background: #f8f9fa;
        color: #333;
      }
    }

    /* Modal Body */
    .modal-body {
      padding: 24px;
    }

    .setting-item {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
    }

    /* Toggle Switch */
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      margin-bottom: 8px;
      
      input {
        display: none;
        
        &:checked + .toggle-slider {
          background: #28a745;
          
          &::before {
            transform: translateX(20px);
          }
        }
      }
    }

    .toggle-slider {
      width: 44px;
      height: 24px;
      background: #ccc;
      border-radius: 12px;
      position: relative;
      transition: background 0.3s;
      
      &::before {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        background: white;
        border-radius: 50%;
        top: 3px;
        left: 3px;
        transition: transform 0.3s;
      }
    }

    .toggle-text {
      font-weight: 500;
      color: #333;
    }

    /* Status Messages */
    .status-message {
      margin-top: 8px;
      
      span {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        padding: 8px 12px;
        border-radius: 6px;
      }
      
      .text-warning {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
      }
      
      .text-success {
        background: #d1edff;
        color: #004085;
        border: 1px solid #b3d9ff;
      }
      
      .text-info {
        background: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
      }
    }

    /* Test Button */
    .btn-test {
      background: #17a2b8;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
      
      &:hover {
        background: #138496;
      }
      
      &:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }
    }

    .help-text {
      display: block;
      margin-top: 6px;
      color: #6c757d;
      font-size: 12px;
    }

    /* Notification Types */
    .notification-types {
      margin-top: 20px;
      
      h4 {
        margin: 0 0 8px 0;
        color: #333;
      }
      
      .types-description {
        color: #666;
        margin-bottom: 16px;
        font-size: 14px;
      }
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .checkbox-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        border-color: #007bff;
        background: #f8f9fa;
      }
      
      input {
        display: none;
        
        &:checked + .checkmark {
          background: #007bff;
          border-color: #007bff;
          
          &::after {
            display: block;
          }
        }
      }
    }

    .checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid #ddd;
      border-radius: 4px;
      position: relative;
      flex-shrink: 0;
      margin-top: 2px;
      transition: all 0.2s;
      
      &::after {
        content: '✓';
        position: absolute;
        color: white;
        font-size: 12px;
        font-weight: bold;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: none;
      }
    }

    .checkbox-content {
      flex: 1;
      
      strong {
        display: block;
        color: #333;
        margin-bottom: 2px;
      }
      
      small {
        color: #666;
        font-size: 12px;
      }
    }

    /* Modal Footer */
    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e9ecef;
      
      button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
      }
      
      .btn-secondary {
        background: #6c757d;
        color: white;
        
        &:hover {
          background: #5a6268;
        }
      }
      
      .btn-primary {
        background: #007bff;
        color: white;
        
        &:hover {
          background: #0056b3;
        }
      }
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class NotificationSettingsComponent implements OnInit {
  @Input() isVisible: boolean = false;
  @Output() closed = new EventEmitter<void>();

  permission$: Observable<NotificationPermission | null>;
  isSubscribed$: Observable<boolean>;
  
  settings = {
    leaveRequests: true,
    missionRequests: true,
    advanceRequests: true,
    systemAlerts: true
  };

  constructor(private notificationService: PushNotificationService) {
    this.permission$ = this.notificationService.notificationPermission;
    this.isSubscribed$ = this.notificationService.isSubscribed;
  }

  ngOnInit() {
    this.notificationService.setupMessageListener();
  }

  close() {
    this.closed.emit();
  }

  async toggleNotifications(event: any) {
    if (event.target.checked) {
      await this.notificationService.subscribeToPush();
    } else {
      await this.notificationService.unsubscribeFromPush();
    }
  }

  async sendTestNotification() {
    await this.notificationService.sendTestNotification();
  }

  saveSettings() {
    // Save settings to local storage or backend
    localStorage.setItem('notificationPreferences', JSON.stringify(this.settings));
    this.close();
  }
}