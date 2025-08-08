import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MissionRequest } from '../../models/MissionRequest.model';
import { environment } from '../../../environments/environment';
import { Worker } from '../../models/Worker.model';

@Injectable({
  providedIn: 'root'
})
export class MissionRequestService {
  private apiUrl = `${environment.apiUrl}/api/missions`;
  private selectedWorkerId: number | null = null;

  constructor(private http: HttpClient) {}

  // Set and get selected worker
  setSelectedWorker(workerId: number) {
    this.selectedWorkerId = workerId;
  }

  getSelectedWorker(): number | null {
    return this.selectedWorkerId;
  }

  // API calls
  getAllMissions(): Observable<MissionRequest[]> {
    return this.http.get<MissionRequest[]>(this.apiUrl);
  }

  getByStatus(status: string): Observable<MissionRequest[]> {
    return this.http.get<MissionRequest[]>(`${this.apiUrl}/status/${status}`);
  }

  createMission(workerId: number, destination: string, missionDate: string): Observable<MissionRequest> {
    const params = new HttpParams()
      .set('workerId', workerId.toString())
      .set('destination', destination)
      .set('missionDate', missionDate);

    return this.http.post<MissionRequest>(this.apiUrl, null, { params });
  }

  getMissionById(id: number): Observable<MissionRequest> {
    return this.http.get<MissionRequest>(`${this.apiUrl}/${id}`);
  }

  deleteMission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateRHStatus(id: number, approved: boolean, comment?: string): Observable<MissionRequest> {
    let params = new HttpParams().set('approved', approved.toString());
    if (comment) {
      params = params.set('comment', comment);
    }
    return this.http.put<MissionRequest>(`${this.apiUrl}/rh-decision/${id}`, null, { params });
  }

  finalApprove(id: number, approved: boolean, comment?: string): Observable<MissionRequest> {
    let params = new HttpParams().set('approved', approved.toString());
    if (comment) {
      params = params.set('comment', comment);
    }
    return this.http.put<MissionRequest>(`${this.apiUrl}/admin-decision/${id}`, null, { params });
  }

  hasPending(workerId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/has-pending/${workerId}`);
  }
}