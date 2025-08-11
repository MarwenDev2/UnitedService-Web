import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DecisionService {
  private baseUrl = `${environment.apiUrl}/api/decisions`;

  constructor(private http: HttpClient) {}

  createDecision(decision: any): Observable<any> {
    return this.http.post(this.baseUrl, decision);
  }

  getDecisions(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  getDecisionById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }
}
