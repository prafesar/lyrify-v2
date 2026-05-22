import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldShowOnboarding,
  isOnboardingCompleted,
  completeOnboarding,
  resetOnboarding
} from '../services/onboardingService';

describe('Empty state / tracks view onboarding display logic', () => {
  beforeEach(() => {
    localStorage.clear();
    resetOnboarding();
  });

  it('declares pristine users as eligible for onboarding block', () => {
    // A pristine user has 0 recent tracks in local history
    const recentTracksCount = 0;
    
    // Onboarding must be shown since it's not completed and history is empty
    expect(isOnboardingCompleted()).toBe(false);
    expect(shouldShowOnboarding(recentTracksCount)).toBe(true);
  });

  it('suppresses onboarding block if the user has recent tracks in history', () => {
    // User has songs in their recent list, representing regular / returning usage
    const recentTracksCount = 3;
    
    // Onboarding should not clobber returning users' empty state
    expect(shouldShowOnboarding(recentTracksCount)).toBe(false);
  });

  it('suppresses onboarding block forever once completed/dismissed', () => {
    // User dismisses or clicks a CTA in the onboarding card
    completeOnboarding();
    
    const recentTracksCount = 0;
    
    // Onboarding must be closed, never popping up again
    expect(isOnboardingCompleted()).toBe(true);
    expect(shouldShowOnboarding(recentTracksCount)).toBe(false);
  });
});
