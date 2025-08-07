import { Decision } from "./Decision.model";

export interface MissionRequest {
    id: number;
    workerId: number;
    destination: string;
    missionDate: string;
    status: string;
    secretaireDecision: Decision;
    rhDecision: Decision;
    adminDecision: Decision;
    dateRequest: string;
}