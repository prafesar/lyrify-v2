import { UserPreferencesRepositoryPort } from "../ports/userPreferencesRepositoryPort";
import { sqliteService } from "../../services/sqliteService";

export class BrowserUserPreferencesRepository implements UserPreferencesRepositoryPort {
  getPreference(key: string, defaultValue: string): string {
    return sqliteService.getPreference(key, defaultValue);
  }

  setPreference(key: string, value: string): void {
    sqliteService.setPreference(key, value);
  }

  getBoolPreference(key: string, defaultValue: boolean): boolean {
    return sqliteService.getBoolPreference(key, defaultValue);
  }

  setBoolPreference(key: string, value: boolean): void {
    sqliteService.setBoolPreference(key, value);
  }

  removePreference(key: string): void {
    sqliteService.removePreference(key);
  }
}
