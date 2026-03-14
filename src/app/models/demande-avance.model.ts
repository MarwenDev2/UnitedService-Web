export interface DemandeAvance {
  id: number;
  workerId: number;
  workerName?: string; // Optional: for display purposes
  requestedAmount: number;
  adminResponseAmount?: number;
  status: 'en_attente_admin' | 'accepte' | 'refuse_admin';
  adminComment: string;
  dateRequest: string; // Using string for date to simplify handling
}
