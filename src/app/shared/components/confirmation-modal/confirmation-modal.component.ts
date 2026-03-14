import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ConfirmationModalComponent {
  @Input() isVisible = false;
  @Input() title = 'Confirmation';
  @Input() message!: string;
  @Input() showComment = false;
  @Input() confirmButtonText = 'Confirm';
  @Input() cancelButtonText = 'Cancel';

  @Output() confirmed = new EventEmitter<string | null>();
  @Output() closed = new EventEmitter<void>();

  comment = '';

  onConfirm(): void {
    this.confirmed.emit(this.showComment ? this.comment : '');
    this.close();
  }

  onClose(): void {
    this.closed.emit();
    this.close();
  }

  private close(): void {
    this.isVisible = false;
    this.comment = '';
  }
}
