import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  authService = inject(AuthService);
  fb = inject(FormBuilder);
  router = inject(Router);
  
  showPassword = false;
  loginError = false;
  errorMessage = '';
  isLoading = false;
  private loginErrorSubscription: Subscription | undefined;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false] // Default to false
    });
    
    // Check if user is already logged in
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    }
  }ngOnInit(): void {
    // Subscribe to login error status
    this.loginErrorSubscription = this.authService.loginError$.subscribe((error: string | null) => {
      this.loginError = !!error;
      this.errorMessage = error || '';
      if (this.loginError) {
        this.isLoading = false;
      }
    });
    
    // Check for stored remember me preference
    const rememberMeStored = localStorage.getItem('united_remember_me') === 'true';
    if (rememberMeStored) {
      this.loginForm.patchValue({ rememberMe: true });
    }
  }

  ngOnDestroy(): void {
    // Clean up subscription
    this.loginErrorSubscription?.unsubscribe();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    
    // Optional: Focus back on password input after toggle
    setTimeout(() => {
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 10);
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.loginError = false;
      this.errorMessage = '';
      
      const { email, password, rememberMe } = this.loginForm.value;
      
      this.authService.login({ email, password }, rememberMe).subscribe({
        next: (user) => {
          this.isLoading = false;
          if (user) {
            console.log('✅ Login successful, redirecting to dashboard');
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.loginError = true;
          this.errorMessage = error.message || 'Login failed';
          console.error('Login error:', error);
        }
      });
    }
  }

  // Optional: Clear form
  resetForm(): void {
    this.loginForm.reset({
      email: '',
      password: '',
      rememberMe: false
    });
    this.loginError = false;
    this.errorMessage = '';
  }
}
