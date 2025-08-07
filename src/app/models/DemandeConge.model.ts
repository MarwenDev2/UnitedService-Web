import { Worker } from './Worker.model';
import { Status } from './Status.enum';
import { Decision } from './Decision.model';
import { TypeConge } from './TypeConge.enum';

export interface DemandeConge {
  id: number;
  worker: Worker;
  type: TypeConge;
  startDate: string;
  endDate: string;
  reason: string;
  status: Status;
  secretaireDecision?: Decision;
  rhDecision?: Decision;
  adminDecision?: Decision;
  attachmentPath?: string;
  dateDemande: string;
}