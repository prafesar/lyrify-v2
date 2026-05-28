import { DailyActivity, DailyProgressSummary } from "../../services/dailyTrackerService";

export interface DailyTrackerRepositoryPort {
  getDailyActivity(date?: Date): DailyActivity;
  saveDailyActivity(activity: DailyActivity): void;
  recordTrackExplored(date?: Date): DailyActivity;
  recordPhraseSaved(date?: Date): DailyActivity;
  recordReviewCompleted(date?: Date): DailyActivity;
  getDailyProgressSummary(activity: DailyActivity): DailyProgressSummary;
}
