import { NavigationCoordinator, CantoLexRoute } from "./navigationService";

let transientTrackCache: any = null;

export function setTransientTrack(track: any) {
  transientTrackCache = track;
}

export function popTransientTrack(id: string): any | null {
  if (transientTrackCache && (
    String(transientTrackCache.id) === id || 
    String(transientTrackCache.trackId) === id || 
    String(transientTrackCache.itunesTrackId) === id
  )) {
    const t = transientTrackCache;
    transientTrackCache = null;
    return t;
  }
  return null;
}

export function parseUrl(pathname: string): CantoLexRoute {
  if (pathname === "/library") {
    return { type: "library" };
  }
  if (pathname === "/study") {
    return { type: "study" };
  }
  if (pathname === "/settings") {
    return { type: "settings" };
  }
  if (pathname.startsWith("/track/")) {
    const id = pathname.substring(7).trim();
    if (id) return { type: "track", id };
  }
  if (pathname.startsWith("/artist/")) {
    const id = pathname.substring(8).trim();
    if (id) return { type: "artist", id };
  }
  if (pathname.startsWith("/album/")) {
    const id = pathname.substring(7).trim();
    if (id) return { type: "album", id };
  }
  return { type: "explore" };
}

export function routeToPath(route: CantoLexRoute): string {
  switch (route.type) {
    case "explore":
      return "/explore";
    case "library":
      return "/library";
    case "study":
      return "/study";
    case "settings":
      return "/settings";
    case "track":
      return `/track/${route.id}`;
    case "artist":
      return `/artist/${route.id}`;
    case "album":
      return `/album/${route.id}`;
  }
}

export function initializeWebNavigation() {
  if (typeof window === "undefined") return;

  // Register the adapter callback
  NavigationCoordinator.registerPlatformAdapter(
    (route, replace) => {
      const path = routeToPath(route);
      if (window.location.pathname === path) return;

      if (replace) {
        window.history.replaceState({ timestamp: Date.now() }, "", path);
      } else {
        window.history.pushState({ timestamp: Date.now() }, "", path);
      }
    },
    () => {
      // Return true if the browser has history stacks to go back to.
      if (NavigationCoordinator.getHistoryStack().length > 0) {
        window.history.back();
        return true;
      }
      return false;
    }
  );

  // Sync back to Coordinator when user uses Browser's Back/Forward buttons
  const syncFromUrl = () => {
    const currentRoute = parseUrl(window.location.pathname);
    NavigationCoordinator.syncRouteFromPlatform(currentRoute);
  };

  window.addEventListener("popstate", syncFromUrl);

  // Run initial sync on bootstrap
  syncFromUrl();
}
