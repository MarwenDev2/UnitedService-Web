import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-content.html',
  styleUrls: ['./main-content.scss']
})
export class MainContent {
  constructor() { }
}