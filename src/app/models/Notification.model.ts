import { Worker } from './Worker.model';

export interface Notification {
  id: number;
  recipient: Worker;
  message: string;
  timestamp: string; // LocalDateTime
  read: boolean;
} 