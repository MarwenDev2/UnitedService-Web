import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { map, catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (user) {
          return of(true); // User is logged in, return observable
        }

        // If no user, check for a token and try to fetch user data
        const token = this.authService.currentToken;
        if (token) {
          return this.authService.getMe().pipe(
            map(fetchedUser => {
              if (fetchedUser) {
                return true;
              }
              return this.router.createUrlTree(['/login']);
            }),
            catchError(() => of(this.router.createUrlTree(['/login'])))
          );
        }

        // No user and no token, redirect to login
        return of(this.router.createUrlTree(['/login']));
      }),
      catchError(() => {
        // In case of an error in the user$ stream, redirect to login
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}