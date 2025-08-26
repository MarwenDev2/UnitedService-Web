import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Worker } from '../../../models/Worker.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-workers-list-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workers-list-modal.html',
  styleUrls: ['./workers-list-modal.scss']
})
export class WorkersListModalComponent {
  workers: Worker[];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { workers: Worker[] },
    public dialogRef: MatDialogRef<WorkersListModalComponent>
  ) {
    this.workers = data.workers || [];
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
