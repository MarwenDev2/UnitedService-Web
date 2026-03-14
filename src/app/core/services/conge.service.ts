import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { DemandeConge } from '../../models/DemandeConge.model';
import { environment } from '../../../environments/environment';
import { Worker } from '../../models/Worker.model';
import { Status } from '../../models/Status.enum';
import { WorkerService } from './worker.service';
import { TypeConge } from '../../models/TypeConge.enum';

@Injectable({
  providedIn: 'root'
})
export class CongeService {
  private apiUrl = `${environment.apiUrl}/api/conges`;
  private selectedWorker : Worker | undefined ;
  constructor(private http: HttpClient,private workerService: WorkerService) { }

  getAllDemandes(): Observable<DemandeConge[]> {
    return this.http.get<DemandeConge[]>(this.apiUrl);
  }

  getDemandesByStatus(status: Status): Observable<DemandeConge[]> {
    return this.http.get<DemandeConge[]>(`${this.apiUrl}/status/${status}`);
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
  
  countByType(type: TypeConge): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count/type/${type}`);
  }

  countByMonth(month: number, year: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count-by-month/${month}/${year}`);
  }
  
  setSelectedWorker(worker: Worker | null) {
    if (worker && worker.id) {
      this.workerService.getWorkerById(worker.id).subscribe({
        next: (foundWorker) => {
          this.selectedWorker = foundWorker;
        }
      });
    } else {
      this.selectedWorker = undefined;
    }
  }

  getSelectedWorker() {
    return this.selectedWorker;
  }

  createDemande(demande: any, file?: File): Observable<DemandeConge> {
    const formData = new FormData();
    formData.append('workerId', this.selectedWorker?.id?.toString() || '');
    formData.append('type', demande.type);
    formData.append('startDate', demande.startDate.toISOString().split('T')[0]); // Format as YYYY-MM-DD
    formData.append('endDate', demande.endDate.toISOString().split('T')[0]);    // Format as YYYY-MM-DD
    formData.append('reason', demande.reason);
    if (file) {
      formData.append('attachment', file);
    }

    return this.http.post<DemandeConge>(this.apiUrl, formData);
  }

  downloadAttachment(filename: string): void {
    const downloadUrl = `${this.apiUrl}/download/${filename}`;
    this.http.get(downloadUrl, { responseType: 'blob' }).subscribe(blob => {
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    }, error => {
      console.error('Download error:', error);
      // Optionally, show a notification to the user
    });
  }

  hasPendingRequest(workerId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/has-pending/${workerId}`);
  }

  checkEligibility(workerId: number, startDate: string, endDate: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/check-eligibility/${workerId}`, {
      params: { startDate, endDate },
      responseType: 'text'
    });
  }
}
