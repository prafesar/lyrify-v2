export interface UserPreferencesRepositoryPort {
  getPreference(key: string, defaultValue: string): string;
  setPreference(key: string, value: string): void;
  getBoolPreference(key: string, defaultValue: boolean): boolean;
  setBoolPreference(key: string, value: boolean): void;
  removePreference(key: string): void;
  clearAllUserData(): Promise<void>;
}
