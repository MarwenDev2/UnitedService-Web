import { Injectable } from '@angular/core';
import { ToastrService, IndividualConfig } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Default options for all toasts
  private toastOptions: Partial<IndividualConfig> = {
    closeButton: true,       // Show a close button
    timeOut: 5000,           // Auto-dismiss after 5 seconds
    progressBar: true,       // Show a progress bar
    easeTime: 300,           // Animation easing time
    positionClass: 'toast-top-right', // Position on the screen
    tapToDismiss: true,      // Dismiss on click
    newestOnTop: true,       // New toasts appear on top
    enableHtml: true,        // Allow HTML in the message
  };

  constructor(private toastr: ToastrService) {}

  /**
   * Shows a success notification.
   * @param message The main message to display.
   * @param title An optional title for the notification.
   * @param overrideOptions Optional configuration to override the defaults.
   */
  showSuccess(message: string, title?: string, overrideOptions?: Partial<IndividualConfig>): void {
    this.toastr.success(message, title, { ...this.toastOptions, ...overrideOptions });
  }

  /**
   * Shows an error notification.
   * @param message The main message to display.
   * @param title An optional title for the notification.
   * @param overrideOptions Optional configuration to override the defaults.
   */
  showError(message: string, title?: string, overrideOptions?: Partial<IndividualConfig>): void {
    this.toastr.error(message, title, { ...this.toastOptions, ...overrideOptions, timeOut: 7000 }); // Longer timeout for errors
  }

  /**
   * Shows a warning notification.
   * @param message The main message to display.
   * @param title An optional title for the notification.
   * @param overrideOptions Optional configuration to override the defaults.
   */
  showWarning(message: string, title?: string, overrideOptions?: Partial<IndividualConfig>): void {
    this.toastr.warning(message, title, { ...this.toastOptions, ...overrideOptions });
  }

  /**
   * Shows an informational notification.
   * @param message The main message to display.
   * @param title An optional title for the notification.
   * @param overrideOptions Optional configuration to override the defaults.
   */
  showInfo(message: string, title?: string, overrideOptions?: Partial<IndividualConfig>): void {
    this.toastr.info(message, title, { ...this.toastOptions, ...overrideOptions });
  }
}

