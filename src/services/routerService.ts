export type CantoLexRoute =
  | { type: "explore" }
  | { type: "library" }
  | { type: "study" }
  | { type: "settings" }
  | { type: "track"; id: string }
  | { type: "artist"; id: string }
  | { type: "album"; id: string };

let navSessionCount = 0;
let transientTrackCache: any = null;

export function setTransientTrack(track: any) {
  transientTrackCache = track;
}

export function popTransientTrack(id: string): any | null {
  if (transientTrackCache && (String(transientTrackCache.id) === id || String(transientTrackCache.trackId) === id)) {
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

export function navigateTo(path: string, options?: { replace?: boolean }) {
  if (typeof window === "undefined") return;
  const currentPath = window.location.pathname;
  if (currentPath === path) return;

  const replace = options?.replace ?? false;
  if (replace) {
    window.history.replaceState({ timestamp: Date.now() }, "", path);
  } else {
    navSessionCount++;
    window.history.pushState({ timestamp: Date.now() }, "", path);
  }
  window.dispatchEvent(new Event("popstate"));
}

export function navigateBack(fallbackPath: string = "/explore") {
  if (typeof window === "undefined") return;
  if (navSessionCount > 0) {
    navSessionCount--;
    window.history.back();
  } else {
    navigateTo(fallbackPath, { replace: true });
  }
}

export function getNavSessionCount(): number {
  return navSessionCount;
}

export function resetNavSessionCount() {
  navSessionCount = 0;
}
