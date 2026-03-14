import { Decision } from "./Decision.model";
import { Worker } from "./Worker.model";

export interface MissionRequest {
    id: number;
    workers: Worker[];
    destination: string;
    missionDate: string;
    endDate: string;
    status: string;
    secretaireDecision: Decision;
    rhDecision: Decision;
    adminDecision: Decision;
    dateRequest: string;
}
