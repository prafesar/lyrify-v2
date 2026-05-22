export interface DailyActivity {
  dateKey: string;
  tracksExplored: number;
  phrasesSaved: number;
  reviewsCompleted: number;
}

export interface DailyProgressSummary {
  dateKey: string;
  tracksExplored: number;
  tracksExploredTarget: number;
  phrasesSaved: number;
  phrasesSavedTarget: number;
  reviewsCompleted: number;
  reviewsCompletedTarget: number;
  overallProgressPercentage: number;
  isGoalAchieved: boolean;
  recommendedNextAction: 'explore' | 'save' | 'review' | 'done';
}

const STORAGE_PREFIX = 'cantolex_daily_activity_';

export const DAILY_TARGETS = {
  tracksExplored: 1,
  phrasesSaved: 3,
  reviewsCompleted: 5,
};

/**
 * Returns formatted local string 'YYYY-MM-DD'
 */
export function getDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Loads the activity record for a given date.
 */
export function getDailyActivity(date: Date = new Date()): DailyActivity {
  const key = getDateKey(date);
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const saved = localStorage.getItem(storageKey);
  
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // In case of corrupt storage
    }
  }

  return {
    dateKey: key,
    tracksExplored: 0,
    phrasesSaved: 0,
    reviewsCompleted: 0,
  };
}

/**
 * Saves a daily activity record to localStorage.
 */
export function saveDailyActivity(activity: DailyActivity): void {
  const storageKey = `${STORAGE_PREFIX}${activity.dateKey}`;
  localStorage.setItem(storageKey, JSON.stringify(activity));
}

/**
 * Records track exploration.
 */
export function recordTrackExplored(date: Date = new Date()): DailyActivity {
  const activity = getDailyActivity(date);
  activity.tracksExplored += 1;
  saveDailyActivity(activity);
  return activity;
}

/**
 * Records phrase saving helper.
 */
export function recordPhraseSaved(date: Date = new Date()): DailyActivity {
  const activity = getDailyActivity(date);
  activity.phrasesSaved += 1;
  saveDailyActivity(activity);
  return activity;
}

/**
 * Records flashcard review completion.
 */
export function recordReviewCompleted(date: Date = new Date()): DailyActivity {
  const activity = getDailyActivity(date);
  activity.reviewsCompleted += 1;
  saveDailyActivity(activity);
  return activity;
}

/**
 * Computes progress summary and suggests the next action.
 */
export function getDailyProgressSummary(activity: DailyActivity): DailyProgressSummary {
  const tracksExploredTarget = DAILY_TARGETS.tracksExplored;
  const phrasesSavedTarget = DAILY_TARGETS.phrasesSaved;
  const reviewsCompletedTarget = DAILY_TARGETS.reviewsCompleted;

  const trackProg = Math.min(tracksExploredTarget, activity.tracksExplored) / tracksExploredTarget;
  const phraseProg = Math.min(phrasesSavedTarget, activity.phrasesSaved) / phrasesSavedTarget;
  const reviewProg = Math.min(reviewsCompletedTarget, activity.reviewsCompleted) / reviewsCompletedTarget;

  // Weighted average capped nicely at 100%
  const overallProgressPercentage = Math.round(((trackProg + phraseProg + reviewProg) / 3) * 100);
  
  const isGoalAchieved = 
    activity.tracksExplored >= tracksExploredTarget &&
    activity.phrasesSaved >= phrasesSavedTarget &&
    activity.reviewsCompleted >= reviewsCompletedTarget;

  let recommendedNextAction: 'explore' | 'save' | 'review' | 'done' = 'done';

  if (activity.tracksExplored < tracksExploredTarget) {
    recommendedNextAction = 'explore';
  } else if (activity.phrasesSaved < phrasesSavedTarget) {
    recommendedNextAction = 'save';
  } else if (activity.reviewsCompleted < reviewsCompletedTarget) {
    recommendedNextAction = 'review';
  }

  return {
    dateKey: activity.dateKey,
    tracksExplored: activity.tracksExplored,
    tracksExploredTarget,
    phrasesSaved: activity.phrasesSaved,
    phrasesSavedTarget,
    reviewsCompleted: activity.reviewsCompleted,
    reviewsCompletedTarget,
    overallProgressPercentage,
    isGoalAchieved,
    recommendedNextAction,
  };
}
