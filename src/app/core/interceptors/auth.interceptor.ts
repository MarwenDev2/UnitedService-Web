import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    console.log('Intercepting request to:', request.url);

    // Skip auth header for login endpoint
    if (request.url.includes('/api/auth/login')) {
        return next.handle(request);
    }

    const token = localStorage.getItem('united_auth_token') || sessionStorage.getItem('united_auth_token');
    if (token) {
        console.log('Adding auth token to request:', request.url);
        request = request.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    } else {
        console.log('No token found for request:', request.url);
    }

    return next.handle(request).pipe(
        tap({
            next: (event) => {
                if (event instanceof HttpResponse) {
                    console.log('Response received:', event.url, event.status, event.body);
                }
            },
            error: (err) => {
                console.error('HTTP error for', request.url, ':', err);
                if (err instanceof HttpErrorResponse && err.status === 401) {
                    this.authService.logout();
                    this.router.navigate(['/login']);
                }
            }
        })
    );
}
}
