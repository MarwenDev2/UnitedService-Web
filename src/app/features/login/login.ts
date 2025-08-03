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
  
  loginError = false;
  private loginErrorSubscription: Subscription | undefined;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }


  ngOnInit(): void {
    // Subscribe to login error status
    this.loginErrorSubscription = this.authService.loginError$.subscribe((error: any) => {
      this.loginError = !!error;
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription
    this.loginErrorSubscription?.unsubscribe();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password, rememberMe } = this.loginForm.value;
      this.authService.login({ email, password }, rememberMe).subscribe(user => {
        if (user) {
          this.router.navigate(['/dashboard']);
        }
      });
    }
  }
}
