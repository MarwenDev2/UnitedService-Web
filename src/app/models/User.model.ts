import { Role } from "./Role.enum";

export interface User {
    id: number;
    name: string;
    email: string;
    password?: string;
    phone: string;
    profileImagePath?: string;
    gender: string;
    dateOfBirth: string;
    address: string;
    role: Role;
  }