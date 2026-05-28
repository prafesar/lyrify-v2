import { DailyTrackerRepositoryPort } from "../ports/dailyTrackerRepositoryPort";
import { DailyActivity, DailyProgressSummary } from "../../services/dailyTrackerService";
import * as originalDailyTrackerService from "../../services/dailyTrackerService";

export class BrowserDailyTrackerRepository implements DailyTrackerRepositoryPort {
  getDailyActivity(date?: Date): DailyActivity {
    return originalDailyTrackerService.getDailyActivity(date);
  }

  saveDailyActivity(activity: DailyActivity): void {
    return originalDailyTrackerService.saveDailyActivity(activity);
  }

  recordTrackExplored(date?: Date): DailyActivity {
    return originalDailyTrackerService.recordTrackExplored(date);
  }

  recordPhraseSaved(date?: Date): DailyActivity {
    return originalDailyTrackerService.recordPhraseSaved(date);
  }

  recordReviewCompleted(date?: Date): DailyActivity {
    return originalDailyTrackerService.recordReviewCompleted(date);
  }

  getDailyProgressSummary(activity: DailyActivity): DailyProgressSummary {
    return originalDailyTrackerService.getDailyProgressSummary(activity);
  }
}
