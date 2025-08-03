import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/notification`;

  constructor(private http: HttpClient) {}

  getAllNotifications(): Observable<any> {
    return this.http.get(`${this.baseUrl}/all`);
  }

  getNotificationsByUser(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/byUser/${userId}`);
  }

  createNotification(notification: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/add`, notification);
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}`);
  }
}
