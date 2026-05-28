import { UserDataMaintenancePort } from "../ports/userDataMaintenancePort";

export class BrowserUserDataMaintenance implements UserDataMaintenancePort {
  async clearAllUserData(): Promise<void> {
    if (typeof window !== "undefined") {
      if (window.localStorage) {
        localStorage.clear();
      }
      try {
        const idb = await import('idb-keyval');
        await idb.del('lyrify_flashcards');
      } catch (err) {
        console.error("Failed to clear idb-keyval in maintenance:", err);
      }
    }
  }
}

export const userDataMaintenanceService = new BrowserUserDataMaintenance();
