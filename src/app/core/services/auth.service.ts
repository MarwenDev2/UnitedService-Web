import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap, switchMap, take, map, filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../../models/User.model';

// A simple JWT decoder function
const decode = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'united_auth_token';
  private readonly USER_KEY = 'united_user_data';
  private readonly API_URL = '/api/auth';
  private authStateChecked = false;
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private http = inject(HttpClient);
  private router = inject(Router);
  private redirectUrl: string | null = null;
  constructor() {
    const token = this.getToken();
    if (token && this.isValidToken(token)) {
      this.tokenSubject.next(token);
      this.isAuthenticatedSubject.next(true);
      this.getMe().subscribe(); // Fetch user data on init
    } else {
      this.isAuthenticatedSubject.next(false);
    }
  }

  private getStorage(): Storage {
    return localStorage.getItem(this.TOKEN_KEY) ? localStorage : sessionStorage;
  }

  getMe(): Observable<User | null> {
    const token = this.getToken();
    if (!token) {
        console.error('No token available for getMe request');
        return of(null);
    }
    console.log('Sending getMe request with token:', token); // Debug log
    return this.http.get<User>('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
    }).pipe(
        tap(user => {
            console.log('User data fetched:', user); // Debug log
            const storage = this.getStorage();
            storage.setItem(this.USER_KEY, JSON.stringify(user));
            this.userSubject.next(user);
            this.isAuthenticatedSubject.next(true);
        }),
        catchError(error => {
            console.error('Failed to fetch user data:', error);
            this.logout();
            return of(null);
        })
    );
}
  
  setRedirectUrl(url: string): void {
    this.redirectUrl = url;
  }

  authStateInitialized(): Observable<boolean> {
    if (this.authStateChecked) {
      return of(true);
    }
    return this.tokenSubject.pipe(
      filter(() => this.authStateChecked),
      take(1),
      map(() => true)
    );
  }
  get currentToken(): string | null {
    return this.tokenSubject.value;
  }

  get isAuthenticated(): boolean {
    const token = this.currentToken;
    return !!token && this.isValidToken(token);
  }

  login(credentials: { email: string; password: string }, rememberMe: boolean = false): Observable<User | null> {
    return this.http.post<{ token: string }>(`${this.API_URL}/login`, credentials).pipe(
        tap(response => {
            if (response && response.token) {
                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem(this.TOKEN_KEY, response.token);
                this.tokenSubject.next(response.token); // Update token subject
            } else {
                throw new Error('No token received from login');
            }
        }),
        switchMap(() => this.getMe()),
        tap(user => {
            if (user) {
                this.router.navigate(['/dashboard']);
            } else {
                throw new Error('Failed to fetch user data after login');
            }
        }),
        catchError(error => {
            console.error('Login failed:', error.message);
            this.logout();
            return of(null);
        })
    );
}

  logout(): void {
    const storage = this.getStorage();
    storage.removeItem(this.TOKEN_KEY);
    storage.removeItem(this.USER_KEY);

    // Also clear the other storage just in case
    const otherStorage = storage === localStorage ? sessionStorage : localStorage;
    otherStorage.removeItem(this.TOKEN_KEY);
    otherStorage.removeItem(this.USER_KEY);

    this.userSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.tokenSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY) || sessionStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  private saveAuthData(token: string, user: User, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.TOKEN_KEY, token);
    storage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private isValidToken(token: string): boolean {
    if (!token) {
      return false;
    }

    const decoded = decode(token);
    if (!decoded || typeof decoded.exp === 'undefined') {
      return false;
    }

    const expirationDate = new Date(0);
    expirationDate.setUTCSeconds(decoded.exp);

    return expirationDate.valueOf() > new Date().valueOf();
  }
}