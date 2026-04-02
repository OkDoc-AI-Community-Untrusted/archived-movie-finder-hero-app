import { Injectable } from '@angular/core';
import { AppState } from '../models/film.interface';
import { LOCAL_STORAGE_KEY } from '../constants';

@Injectable({ providedIn: 'root' })
export class StorageService {

  loadState(): AppState | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as AppState;
    } catch {
      return null;
    }
  }

  saveState(state: AppState): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }
}
