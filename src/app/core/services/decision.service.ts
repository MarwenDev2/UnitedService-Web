import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DecisionService {
  private baseUrl = `${environment.apiUrl}/decision`;

  constructor(private http: HttpClient) {}

  createDecision(decision: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/add`, decision);
  }

  getDecisions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/all`);
  }

  getDecisionsByUser(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/byUser/${id}`);
  }

  deleteDecision(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}`);
  }
}
