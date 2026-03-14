import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemandeAvance } from '../../models/demande-avance.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DemandeAvanceService {

  private apiUrl = environment.apiUrl + '/api/avances';

  constructor(private http: HttpClient) { }

  getAllDemandeAvances(): Observable<DemandeAvance[]> {
    return this.http.get<DemandeAvance[]>(this.apiUrl);
  }

  getDemandesByStatus(status: string): Observable<DemandeAvance[]> {
    return this.http.get<DemandeAvance[]>(`${this.apiUrl}/status/${status}`);
  }

  createDemandeAvance(workerId: number, requestedAmount: number): Observable<DemandeAvance> {
    const params = new HttpParams()
      .set('workerId', workerId.toString())
      .set('requestedAmount', requestedAmount.toString());
    return this.http.post<DemandeAvance>(this.apiUrl, null, { params });
  }

  updateAdminResponse(demandeId: number, adminResponseAmount: number, adminComment: string): Observable<DemandeAvance> {
    const params = new HttpParams()
      .set('adminResponseAmount', adminResponseAmount.toString())
      .set('adminComment', adminComment);
    return this.http.put<DemandeAvance>(`${this.apiUrl}/admin-response/${demandeId}`, null, { params });
  }

  deleteDemandeAvance(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  hasPendingRequest(workerId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/has-pending/${workerId}`);
  }
}
