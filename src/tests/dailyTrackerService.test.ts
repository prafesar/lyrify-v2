import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDateKey,
  getDailyActivity,
  saveDailyActivity,
  recordTrackExplored,
  recordPhraseSaved,
  recordReviewCompleted,
  getDailyProgressSummary,
  DailyActivity
} from '../services/dailyTrackerService';

describe('Daily Tracker Service Rules and State Actions', () => {
  const testDate = new Date('2026-05-22T10:00:00Z');

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('getDateKey formats date objects into standard YYYY-MM-DD local keys', () => {
    const key = getDateKey(testDate);
    expect(key).toBe('2026-05-22');
  });

  it('getDailyActivity returns empty counters when date is uninitialized', () => {
    const activity = getDailyActivity(testDate);
    expect(activity.dateKey).toBe('2026-05-22');
    expect(activity.tracksExplored).toBe(0);
    expect(activity.phrasesSaved).toBe(0);
    expect(activity.reviewsCompleted).toBe(0);
  });

  it('can explicitly write and save any custom activity payload', () => {
    const custom: DailyActivity = {
      dateKey: '2026-05-22',
      tracksExplored: 1,
      phrasesSaved: 4,
      reviewsCompleted: 2,
    };
    saveDailyActivity(custom);
    const loaded = getDailyActivity(testDate);
    expect(loaded).toEqual(custom);
  });

  it('records user actions and increments the corresponding fields independently', () => {
    recordTrackExplored(testDate);
    recordPhraseSaved(testDate);
    recordPhraseSaved(testDate);
    recordReviewCompleted(testDate);

    const activity = getDailyActivity(testDate);
    expect(activity.tracksExplored).toBe(1);
    expect(activity.phrasesSaved).toBe(2);
    expect(activity.reviewsCompleted).toBe(1);
  });

  it('isolates progress calculations by day (testing rollover)', () => {
    recordTrackExplored(testDate);

    const nextDay = new Date('2026-05-23T10:00:00Z');
    const prevDayActivity = getDailyActivity(testDate);
    const nextDayActivity = getDailyActivity(nextDay);

    expect(prevDayActivity.tracksExplored).toBe(1);
    expect(nextDayActivity.tracksExplored).toBe(0);
  });

  it('correctly orders recommended priority actions based on completion depth', () => {
    const activity: DailyActivity = {
      dateKey: '2026-05-22',
      tracksExplored: 0,
      phrasesSaved: 0,
      reviewsCompleted: 0,
    };

    // Step 1: No tracks explored -> recommend explore
    let summary = getDailyProgressSummary(activity);
    expect(summary.recommendedNextAction).toBe('explore');
    expect(summary.isGoalAchieved).toBe(false);

    // Step 2: Track explored but phrases are too low -> recommend save
    activity.tracksExplored = 1;
    summary = getDailyProgressSummary(activity);
    expect(summary.recommendedNextAction).toBe('save');

    // Step 3: Track and phrases done, but reviews are still low -> recommend review
    activity.phrasesSaved = 3;
    summary = getDailyProgressSummary(activity);
    expect(summary.recommendedNextAction).toBe('review');

    // Step 4: All targets satisfied -> done
    activity.reviewsCompleted = 5;
    summary = getDailyProgressSummary(activity);
    expect(summary.recommendedNextAction).toBe('done');
    expect(summary.isGoalAchieved).toBe(true);
  });

  it('accurately maps average progress metrics, capping percentages gracefully', () => {
    const activity: DailyActivity = {
      dateKey: '2026-05-22',
      tracksExplored: 5, // exceeds target (1)
      phrasesSaved: 0,
      reviewsCompleted: 0,
    };

    // 1/3 progress should represent ~33% overall completeness (rather than allowing track to overflow the total)
    const summary = getDailyProgressSummary(activity);
    expect(summary.overallProgressPercentage).toBe(33);
  });
});
