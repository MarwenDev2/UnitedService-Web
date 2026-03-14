import { User } from './User.model';

export interface Decision {
  id: number;
  decisionBy: User;
  approved: boolean;
  comment: string;
  date: string;
}