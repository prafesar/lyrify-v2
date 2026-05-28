import { UserDataMaintenancePort } from "../ports/userDataMaintenancePort";
import { sqliteService } from "../../services/sqliteService";

export class BrowserUserDataMaintenance implements UserDataMaintenancePort {
  async clearAllUserData(): Promise<void> {
    try {
      await sqliteService.clearAllUserData();
    } catch (sqliteErr) {
      console.error("Failed to clear SQLite user data:", sqliteErr);
    }

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
