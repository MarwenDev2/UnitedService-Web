import { Role } from "./Role.enum";

export interface User {
    id: number;
    name: string;
    email: string;
    password?: string;
    phoneNumber: string;
    photoUrl?: string;
    gender: string;
    dateOfBirth: string;
    address: string;
    role: Role;

}