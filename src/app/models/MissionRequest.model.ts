import { Decision } from "./Decision.model";
import { Worker } from "./Worker.model";

export interface MissionRequest {
    id: number;
    worker: Worker;
    destination: string;
    missionDate: string;
    status: string;
    secretaireDecision: Decision;
    rhDecision: Decision;
    adminDecision: Decision;
    dateRequest: string;
}