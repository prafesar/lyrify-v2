export type CantoLexRoute =
  | { type: "explore" }
  | { type: "library" }
  | { type: "study"; id?: string }
  | { type: "settings" }
  | { type: "track"; id: string }
  | { type: "artist"; id: string }
  | { type: "album"; id: string };

type NavigationListener = (route: CantoLexRoute) => void;

class NavigationCoordinatorClass {
  private currentRoute: CantoLexRoute = { type: "explore" };
  private historyStack: CantoLexRoute[] = [];
  private listeners: Set<NavigationListener> = new Set();
  private platformAdapter: ((route: CantoLexRoute, replace?: boolean) => void) | null = null;
  private platformBackHandler: (() => boolean) | null = null;

  getCurrentRoute(): CantoLexRoute {
    return this.currentRoute;
  }

  getHistoryStack(): CantoLexRoute[] {
    return [...this.historyStack];
  }

  registerPlatformAdapter(
    adapter: (route: CantoLexRoute, replace?: boolean) => void,
    backHandler?: () => boolean
  ) {
    this.platformAdapter = adapter;
    this.platformBackHandler = backHandler || null;
  }

  subscribe(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange() {
    this.listeners.forEach((listener) => listener(this.currentRoute));
  }

  // Sync route from external platforms (e.g. popstate handler)
  syncRouteFromPlatform(route: CantoLexRoute) {
    if (this.isRouteEqual(this.currentRoute, route)) {
      return;
    }
    this.currentRoute = route;
    this.emitChange();
  }

  navigateToRoute(route: CantoLexRoute, options?: { replace?: boolean }) {
    const replace = options?.replace ?? false;

    if (this.isRouteEqual(this.currentRoute, route)) {
      return;
    }

    if (!replace) {
      this.historyStack.push(this.currentRoute);
    }

    this.currentRoute = route;

    if (this.platformAdapter) {
      this.platformAdapter(route, replace);
    }

    this.emitChange();
  }

  goBack(fallbackRoute: CantoLexRoute = { type: "explore" }) {
    // If the platform handler handles it, let it.
    if (this.platformBackHandler && this.platformBackHandler()) {
      return;
    }

    if (this.historyStack.length > 0) {
      const prevRoute = this.historyStack.pop()!;
      this.currentRoute = prevRoute;
      if (this.platformAdapter) {
        this.platformAdapter(prevRoute, true);
      }
      this.emitChange();
    } else {
      const calculatedFallback = this.calculateFallback(this.currentRoute, fallbackRoute);
      this.navigateToRoute(calculatedFallback, { replace: true });
    }
  }

  private calculateFallback(current: CantoLexRoute, providedFallback: CantoLexRoute): CantoLexRoute {
    switch (current.type) {
      case "settings":
      case "study":
      case "track":
      case "artist":
      case "album":
        return { type: "explore" };
      default:
        return providedFallback;
    }
  }

  isRouteEqual(r1: CantoLexRoute, r2: CantoLexRoute): boolean {
    if (r1.type !== r2.type) return false;
    
    const r1Id = (r1 as any).id;
    const r2Id = (r2 as any).id;
    
    if (r1Id !== undefined || r2Id !== undefined) {
      return r1Id === r2Id;
    }
    
    return true;
  }

  // Programmatic Intents
  goToExplore() {
    this.navigateToRoute({ type: "explore" });
  }

  goToLibrary() {
    this.navigateToRoute({ type: "library" });
  }

  goToStudy(trackId?: string) {
    this.navigateToRoute({ type: "study", id: trackId });
  }

  goToSettings() {
    this.navigateToRoute({ type: "settings" });
  }

  goToTrack(id: string) {
    this.navigateToRoute({ type: "track", id });
  }

  goToArtist(id: string) {
    this.navigateToRoute({ type: "artist", id });
  }

  goToAlbum(id: string) {
    this.navigateToRoute({ type: "album", id });
  }

  clearHistory() {
    this.historyStack = [];
  }
}

export const NavigationCoordinator = new NavigationCoordinatorClass();
