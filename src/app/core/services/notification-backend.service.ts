import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Notification } from '../../models/Notification.model';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class NotificationBackendService {

  private apiUrl = environment.apiUrl + '/api/notifications';
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };
  constructor(private http: HttpClient) { }

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/dashboard`);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count/unread`);
  }

    markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/mark-read/${id}`, {});
  }

  createNotification(notification: Notification): Observable<Notification> {
    const payload = {
      recipient: { id: notification.recipient.id },
      message: notification.message,
      read: false,
      timestamp: new Date().toISOString()
    };
  
    console.log('Sending notification payload:', JSON.stringify(payload, null, 2));
    
    // Log the current auth token
    const token = localStorage.getItem('auth_token');
    console.log('Current auth token:', token ? 'Token exists' : 'No token found');
    
    return this.http.post<Notification>(this.apiUrl, payload, {
      ...this.httpOptions
    }).pipe(
      tap((response: Notification) => {
        console.log('Notification created successfully:', response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating notification:');
        console.error('Status:', error.status);
        console.error('Status Text:', error.statusText);
        console.error('Error Object:', error.error);
        console.error('Response Headers:', error.headers);
        console.error('Full Error:', error);
        
        return throwError(() => error);
      })
    );
  }
}
