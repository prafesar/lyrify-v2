import { UserPreferencesRepositoryPort } from "../ports/userPreferencesRepositoryPort";

export class BrowserUserPreferencesRepository implements UserPreferencesRepositoryPort {
  getPreference(key: string, defaultValue: string): string {
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultValue;
    }
    return localStorage.getItem(key) || defaultValue;
  }

  setPreference(key: string, value: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, value);
    }
  }

  getBoolPreference(key: string, defaultValue: boolean): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultValue;
    }
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    return val === "true";
  }

  setBoolPreference(key: string, value: boolean): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, String(value));
    }
  }

  removePreference(key: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(key);
    }
  }

  async clearAllUserData(): Promise<void> {
    if (typeof window !== "undefined") {
      if (window.localStorage) {
        localStorage.clear();
      }
      try {
        const idb = await import('idb-keyval');
        await idb.del('lyrify_flashcards');
      } catch (err) {
        console.error("Failed to clear idb-keyval in repository:", err);
      }
    }
  }
}
