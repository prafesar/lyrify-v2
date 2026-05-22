import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isOnboardingCompleted,
  completeOnboarding,
  resetOnboarding,
  shouldShowOnboarding,
  ONBOARDING_DEMO_TRACKS
} from '../services/onboardingService';

describe('onboardingService unit tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initially return completed as false', () => {
    expect(isOnboardingCompleted()).toBe(false);
  });

  it('should return completed as true after completeOnboarding is called', () => {
    completeOnboarding();
    expect(isOnboardingCompleted()).toBe(true);
  });

  it('should correctly reset onboarding back to false', () => {
    completeOnboarding();
    expect(isOnboardingCompleted()).toBe(true);
    resetOnboarding();
    expect(isOnboardingCompleted()).toBe(false);
  });

  it('should return true for shouldShowOnboarding when not completed and recentTracks is empty (0)', () => {
    expect(shouldShowOnboarding(0)).toBe(true);
  });

  it('should return false for shouldShowOnboarding if recentTracks has items', () => {
    expect(shouldShowOnboarding(3)).toBe(false);
  });

  it('should return false for shouldShowOnboarding if onboarding is already completed', () => {
    completeOnboarding();
    expect(shouldShowOnboarding(0)).toBe(false);
  });

  it('should contain valid prebaked demo tracks', () => {
    expect(ONBOARDING_DEMO_TRACKS).toHaveLength(2);
    expect(ONBOARDING_DEMO_TRACKS[0].title).toBe('La Vie En Rose');
    expect(ONBOARDING_DEMO_TRACKS[0].sourceLanguage).toBe('French');
  });
});
