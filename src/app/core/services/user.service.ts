import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { User } from '../../models/User.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = `${environment.apiUrl}/api/users`;
  userForm: any;

  constructor(private http: HttpClient) { }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  
  addUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user).pipe(
      catchError(error => {
        console.error('Error adding user:', error);
        let errorMessage = 'Failed to create user';
        
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Error: ${error.error.message}`;
        } else {
          errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  changePassword(userId: number, data: { currentPassword: string, newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password/${userId}`, data);
  }

  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user).pipe(
      catchError(error => {
        console.error('Error updating user:', error);
        let errorMessage = 'Failed to update user';
        
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Error: ${error.error.message}`;
        } else {
          errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }


  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

getCurrentUser(): Observable<User> {
  return this.http.get<User>(`${this.apiUrl}/me`).pipe(
    catchError(error => {
      console.error('Error fetching current user:', error);
      throw new Error('Failed to fetch user data');
    })
  );
}

// Upload profile image
uploadProfileImage(formData: FormData): Observable<any> {
  return this.http.post(`${this.apiUrl}/upload-image`, formData).pipe(
    catchError(error => {
      console.error('Error uploading profile image:', error);
      let errorMessage = 'Failed to upload profile image';
      
      if (error.error instanceof ErrorEvent) {
        errorMessage = `Error: ${error.error.message}`;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
      }
      
      return throwError(() => new Error(errorMessage));
    })
  );
}
}