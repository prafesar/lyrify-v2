import { userPreferencesRepository } from "../application";

const ONBOARDING_COMPLETED_KEY = "cantolex_onboarding_completed";

export interface OnboardingState {
  completed: boolean;
}

/**
 * Checks if the user has completed the onboarding flow.
 */
export function isOnboardingCompleted(): boolean {
  return userPreferencesRepository.getBoolPreference(ONBOARDING_COMPLETED_KEY, false);
}

/**
 * Marks the onboarding flow as completed.
 */
export function completeOnboarding(): void {
  userPreferencesRepository.setBoolPreference(ONBOARDING_COMPLETED_KEY, true);
}

/**
 * Resets the onboarding state (useful for testing or profile reset).
 */
export function resetOnboarding(): void {
  userPreferencesRepository.removePreference(ONBOARDING_COMPLETED_KEY);
}

/**
 * Determines whether the onboarding block should be rendered.
 * It shows only if the user hasn't completed it and has no recent tracks in history.
 */
export function shouldShowOnboarding(recentTracksLength: number): boolean {
  return !isOnboardingCompleted() && recentTracksLength === 0;
}

/**
 * Curated list of popular onboarding demo tracks to start learning immediately.
 */
export interface OnboardingDemoTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  sourceLanguage?: string;
}

export const ONBOARDING_DEMO_TRACKS: OnboardingDemoTrack[] = [
  {
    id: "demo-la-vie-en-rose",
    title: "La Vie En Rose",
    artist: "Édith Piaf",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/4a/db/e7/4adbe7eb-0797-df08-d67b-1cb1f35f2976/00602537750800.rgb.jpg/200x200bb.jpg",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/da/bf/6d/dabf6d7c-8608-f469-8393-27c593bf45d2/mzaf_6717103444853051412.plus.aac.p.m4a",
    difficulty: "beginner",
    sourceLanguage: "French"
  },
  {
    id: "demo-despacito",
    title: "Despacito",
    artist: "Luis Fonsi",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/ab/ef/11/abef11a8-ff25-1e35-d225-b44c66099df3/17UMGIM03719.rgb.jpg/200x200bb.jpg",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/15/45/6a/15456a06-b389-9ef3-40f4-d53caed90333/mzaf_5528096181734633783.plus.aac.p.m4a",
    difficulty: "intermediate",
    sourceLanguage: "Spanish"
  }
];
