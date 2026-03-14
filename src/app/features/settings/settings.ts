import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationSettingsComponent } from '../notification-settings/notification-settings';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationSettingsComponent],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and settings</p>
      </div>

      <div class="settings-content">
        <div class="settings-card">
          <h2>
            <i class="fas fa-bell"></i>
            Notification Preferences
          </h2>
          <p class="settings-description">
            Configure how you want to receive notifications for leave requests, missions, and advances.
          </p>
          
          <app-notification-settings></app-notification-settings>
        </div>

        <div class="settings-card">
          <h2>
            <i class="fas fa-user"></i>
            Profile Settings
          </h2>
          <p class="settings-description">
            Manage your personal information and account details.
          </p>
          <!-- Add your profile settings here -->
        </div>

        <div class="settings-card">
          <h2>
            <i class="fas fa-shield-alt"></i>
            Security
          </h2>
          <p class="settings-description">
            Update your password and security preferences.
          </p>
          <!-- Add your security settings here -->
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .settings-header {
      margin-bottom: 30px;
      
      h1 {
        color: #333;
        margin-bottom: 8px;
      }
      
      p {
        color: #666;
        margin: 0;
      }
    }

    .settings-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .settings-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 24px;
      
      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #333;
        margin: 0 0 16px 0;
        font-size: 20px;
        
        i {
          color: #007bff;
        }
      }
    }

    .settings-description {
      color: #666;
      margin-bottom: 20px;
      line-height: 1.5;
    }
  `]
})
export class SettingsComponent {}