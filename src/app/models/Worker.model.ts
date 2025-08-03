import { DemandeConge } from "./DemandeConge.model";

export interface Worker {
    id: number;
    name: string;
    cin: string;
    department: string;
    position: string;
    phone: string;
    email: string;
    salary: number;
    profileImagePath?: string;
    gender: string;
    dateOfBirth: string;
    address: string;
    creationDate: string;
    status: string;
    totalCongeDays: number;
    usedCongeDays: number;
    demandes?: DemandeConge[];
  }