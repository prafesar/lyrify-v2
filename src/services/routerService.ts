import { NavigationCoordinator, CantoLexRoute } from "./navigationService";
import { 
  setTransientTrack as webSetTransient, 
  popTransientTrack as webPopTransient, 
  parseUrl as webParse, 
  routeToPath as webRouteToPath 
} from "./webNavigationAdapter";

export type { CantoLexRoute };

let navSessionCount = 0;

export function setTransientTrack(track: any) {
  webSetTransient(track);
}

export function popTransientTrack(id: string): any | null {
  return webPopTransient(id);
}

export function parseUrl(pathname: string): CantoLexRoute {
  return webParse(pathname) as CantoLexRoute;
}

export function routeToPath(route: CantoLexRoute): string {
  return webRouteToPath(route);
}

export function navigateTo(path: string, options?: { replace?: boolean }) {
  if (typeof window !== "undefined") {
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
  } else {
    const route = webParse(path);
    NavigationCoordinator.navigateToRoute(route, options);
  }
}

export function navigateBack(fallbackPath: string = "/explore") {
  if (typeof window !== "undefined") {
    if (navSessionCount > 0) {
      navSessionCount--;
      window.history.back();
    } else {
      navigateTo(fallbackPath, { replace: true });
    }
  } else {
    const fallbackRoute = webParse(fallbackPath);
    NavigationCoordinator.goBack(fallbackRoute);
  }
}

export function getNavSessionCount(): number {
  return navSessionCount;
}

export function resetNavSessionCount() {
  navSessionCount = 0;
}
