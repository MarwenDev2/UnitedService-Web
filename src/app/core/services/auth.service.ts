import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap, switchMap, take, map, filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../../models/User.model';
import { NotificationService } from './notification.service';

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
  private readonly SESSION_START_KEY = 'united_session_start_time';
  private readonly API_URL = `${environment.apiUrl}/api/auth`;
  private authStateChecked = false;
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  public get currentUserValue(): User | null {
    return this.userSubject.value;
  }
  private loginErrorSubject = new BehaviorSubject<string | null>(null);
  loginError$ = this.loginErrorSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private http = inject(HttpClient);
  private router = inject(Router);
  private zone = inject(NgZone);
  private redirectUrl: string | null = null;

  constructor(private notificationService: NotificationService) { 
    
  }

  initAuthState(): void {
    this.checkSessionTimeout();
    const token = this.getToken();
    if (token && this.isValidToken(token)) {
      this.tokenSubject.next(token);
      this.isAuthenticatedSubject.next(true);
      this.getMe().subscribe(() => {
        this.authStateChecked = true;
      });
    } else {
      this.isAuthenticatedSubject.next(false);
      this.authStateChecked = true;
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
    console.log('Sending getMe request with token:', token);
    return this.http.get<User>('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap(user => {
        console.log('User data fetched:', user);
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

  checkAuthStatus(): Observable<boolean> {
    return this.authStateInitialized().pipe(
      map(() => this.isAuthenticated)
    );
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
          storage.setItem(this.SESSION_START_KEY, new Date().getTime().toString());
          this.tokenSubject.next(response.token);
          console.log('Token stored:', response.token);
          this.loginErrorSubject.next(null); // Clear previous errors
        } else {
          throw new Error('No token received from login');
        }
      }),
      switchMap(() => this.getMe()),
      tap(user => {
        if (!user) {
            this.loginErrorSubject.next('Failed to fetch user data after login');
        }
      }),
      catchError(error => {
        const errorMessage = error?.error?.message || 'Invalid credentials';
        console.error('Login failed:', errorMessage);
        this.loginErrorSubject.next(errorMessage);
        // Re-throw the error to be caught by the component
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  logout(): void {
    const storage = this.getStorage();
    storage.removeItem(this.TOKEN_KEY);
    storage.removeItem(this.USER_KEY);
    storage.removeItem(this.SESSION_START_KEY);

    const otherStorage = storage === localStorage ? sessionStorage : localStorage;
    otherStorage.removeItem(this.TOKEN_KEY);
    otherStorage.removeItem(this.USER_KEY);
    otherStorage.removeItem(this.SESSION_START_KEY);

    this.userSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.tokenSubject.next(null);
    this.loginErrorSubject.next(null);
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

  private checkSessionTimeout(): void {
    const startTimeString = this.getStorage().getItem(this.SESSION_START_KEY);
    if (startTimeString) {
      const startTime = parseInt(startTimeString, 10);
      const oneHour = 60 * 60 * 1000;
      if (new Date().getTime() - startTime > oneHour) {
        console.log('Session expired, logging out');
        this.notificationService.showWarning('Session expired, please log in again.', 'Session Expired');
        this.logout();
      }
    }
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