import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private isCollapsed = new BehaviorSubject<boolean>(false);
  isCollapsed$ = this.isCollapsed.asObservable();

  constructor() { }

  toggleSidebar() {
    this.isCollapsed.next(!this.isCollapsed.value);
  }

  setSidebarState(state: boolean) {
    this.isCollapsed.next(state);
  }
}
