import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('auth_token');
    console.log('Auth interceptor - adding token to request:', {
      url: request.url,
      hasToken: !!token,
      method: request.method
    });
  
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP error in interceptor:', {
          url: request.url,
          status: error.status,
          statusText: error.statusText,
          error: error.error
        });
        return throwError(() => error);
      })
    );
  }
}
