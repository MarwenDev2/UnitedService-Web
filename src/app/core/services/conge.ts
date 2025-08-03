import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemandeConge, Status, TypeConge } from '../../models/conge.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CongeService {
  private apiUrl = `${environment.apiUrl}/api/conges`;

  constructor(private http: HttpClient) { }

  getAllDemandes(): Observable<DemandeConge[]> {
    return this.http.get<DemandeConge[]>(this.apiUrl);
  }

  getDemandesByStatus(status: Status): Observable<DemandeConge[]> {
    return this.http.get<DemandeConge[]>(`${this.apiUrl}/status/${status}`);
  }

  createDemande(demande: DemandeConge): Observable<DemandeConge> {
    return this.http.post<DemandeConge>(this.apiUrl, demande);
  }

  updateDemande(id: number, demande: DemandeConge): Observable<DemandeConge> {
    return this.http.put<DemandeConge>(`${this.apiUrl}/${id}`, demande);
  }

  deleteDemande(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateRHStatus(id: number, approved: boolean): Observable<void> {
    const params = new HttpParams().set('approved', approved.toString());
    return this.http.put<void>(`${this.apiUrl}/rh-decision/${id}`, null, { params });
  }

  finalApprove(id: number, approved: boolean): Observable<void> {
    const params = new HttpParams().set('approved', approved.toString());
    return this.http.put<void>(`${this.apiUrl}/admin-decision/${id}`, null, { params });
  }

  // Stats
  countAll(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count/all`);
  }

  countByStatus(status: Status): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count/status/${status}`);
  }
}
