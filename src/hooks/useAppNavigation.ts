import { useState, useEffect } from "react";
import { NavigationCoordinator, CantoLexRoute } from "../services/navigationService";

export function useAppNavigation() {
  const [currentRoute, setCurrentRoute] = useState<CantoLexRoute>(() =>
    NavigationCoordinator.getCurrentRoute()
  );

  useEffect(() => {
    return NavigationCoordinator.subscribe((route) => {
      setCurrentRoute(route);
    });
  }, []);

  // Map high-level route types to the internal UI view states
  const view = currentRoute.type === "track"
    ? "lyrics"
    : (currentRoute.type === "explore" || currentRoute.type === "artist" || currentRoute.type === "album")
      ? "tracks"
      : currentRoute.type; // "library", "study", "settings"

  return {
    currentRoute,
    view,
    goToExplore: () => NavigationCoordinator.goToExplore(),
    goToLibrary: () => NavigationCoordinator.goToLibrary(),
    goToStudy: (trackId?: string) => NavigationCoordinator.goToStudy(trackId),
    goToSettings: () => NavigationCoordinator.goToSettings(),
    goToTrack: (id: string) => NavigationCoordinator.goToTrack(id),
    goToArtist: (id: string) => NavigationCoordinator.goToArtist(id),
    goToAlbum: (id: string) => NavigationCoordinator.goToAlbum(id),
    goBack: (fallbackRoute?: CantoLexRoute) => NavigationCoordinator.goBack(fallbackRoute),
  };
}
