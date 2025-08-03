export interface DemandeConge {
  id: number;
  startDate: string; 
  endDate: string;
  reason: string;
  status: Status;
  currentStage: string;
  worker: any; // Replace with a proper Worker model if you have one
}

export enum Status {
  EN_ATTENTE_RH = 'EN_ATTENTE_RH',
  EN_ATTENTE_ADMIN = 'EN_ATTENTE_ADMIN',
  REFUSE_RH = 'REFUSE_RH',
  REFUSE_ADMIN = 'REFUSE_ADMIN',
  ACCEPTE = 'ACCEPTE',
}

export enum TypeConge {
  ANNUEL = 'ANNUEL',
  MALADIE = 'MALADIE',
  MATERNITE = 'MATERNITE',
  PATERNITE = 'PATERNITE',
  SPECIAL = 'SPECIAL',
}
