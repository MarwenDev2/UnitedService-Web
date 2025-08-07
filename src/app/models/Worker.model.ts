import { DemandeConge } from './DemandeConge.model';

export interface Worker {
  id: number;
  name: string;
  cin: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  salary: number;
  gender: 'Homme' | 'Femme';
  dateOfBirth: string; // Should be in 'YYYY-MM-DD' format
  address: string;
  creationDate: string; // Should be in 'YYYY-MM-DD' format
  status: 'actif' | 'inactif';
  totalCongeDays: number;
  usedCongeDays: number;
  profileImagePath?: string;
  demandes?: DemandeConge[];
}