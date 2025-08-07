import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Worker } from '../../models/Worker.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WorkerService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/workers`;

  constructor() { }

  getAllWorkers(): Observable<Worker[]> {
    return this.http.get<Worker[]>(this.API_URL);
  }

  getWorkerById(id: number): Observable<Worker> {
    return this.http.get<Worker>(`${this.API_URL}/${id}`);
  }

  getWorkerByCin(cin: string): Observable<Worker> {
    return this.http.get<Worker>(`${this.API_URL}/cin/${cin}`);
  }

  getWorkerPhotoUrl(id: number): Observable<string> {
    return this.http.get(`${this.API_URL}/${id}/photo`, { responseType: 'text' });
  }

  uploadWorkerPhoto(id: number, file: File): Observable<Worker> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Worker>(`${this.API_URL}/${id}/photo`, formData);
  }

  createWorker(worker: Worker): Observable<Worker> {
    return this.http.post<Worker>(this.API_URL, worker);
  }

  updateWorker(id: number, worker: Worker): Observable<Worker> {
    return this.http.put<Worker>(`${this.API_URL}/${id}`, worker);
  }

  deleteWorker(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
