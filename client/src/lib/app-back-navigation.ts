/** Accueil : seul onglet d'où le back matériel peut quitter l'app. */
export const APP_BACK_HOME_PATH = "/home";

export type AppBackNavigateAction = { type: "navigate"; to: string };

export type AppBackAction =
  | "dismiss-overlay"
  | "click-back-control"
  | "history-back"
  | "go-home"
  | "stay"
  | "exit"
  | AppBackNavigateAction;

export type OnboardingBackTarget =
  | { kind: "path"; to: string }
  | { kind: "stay" };

const OPEN_OVERLAY_SELECTORS = [
  '[data-slot="drawer-content"][data-state="open"]',
  '[data-slot="dialog-content"][data-state="open"]',
  '[data-slot="select-content"][data-state="open"]',
  '[data-slot="popover-content"][data-state="open"]',
  "[data-radix-popper-content-wrapper]",
];

const HARDWARE_BACK_CONTROL_SELECTOR = "[data-hardware-back]";

let inAppHistoryDepth = 0;
let androidBackMuted = 0;
const hardwareBackHandlers: Array<() => boolean> = [];

export function setInAppHistoryDepth(depth: number): void {
  inAppHistoryDepth = Math.max(0, depth);
}

export function muteAndroidBackButton(): () => void {
  androidBackMuted += 1;
  return () => {
    androidBackMuted = Math.max(0, androidBackMuted - 1);
  };
}

export function isAndroidBackButtonMuted(): boolean {
  return androidBackMuted > 0;
}

/** Handler local (sous-étapes auth / salle). `true` = back consommé. */
export function registerHardwareBackHandler(handler: () => boolean): () => void {
  hardwareBackHandlers.push(handler);
  return () => {
    const index = hardwareBackHandlers.lastIndexOf(handler);
    if (index >= 0) hardwareBackHandlers.splice(index, 1);
  };
}

export function runHardwareBackHandlers(): boolean {
  for (let i = hardwareBackHandlers.length - 1; i >= 0; i -= 1) {
    if (hardwareBackHandlers[i]?.()) return true;
  }
  return false;
}

/**
 * Historique React Router (HashRouter).
 * Ne pas utiliser `canGoBack` Capacitor : la WebView Android ne compte
 * souvent pas les changements de hash, donc le back quittait l'app partout.
 */
export function canGoBackInAppHistory(
  historyState: unknown = typeof window === "undefined" ? null : window.history.state,
): boolean {
  if (inAppHistoryDepth > 1) return true;
  if (historyState == null || typeof historyState !== "object") return false;
  const idx = (historyState as { idx?: unknown }).idx;
  return typeof idx === "number" && idx > 0;
}

/** Routes racines : back matériel quitte l'app s'il n'y a plus d'historique. */
export function isAppBackExitRoute(pathname: string): boolean {
  return pathname === "/" || pathname === "/home" || pathname === "/auth";
}

function normalizeOnboardingStep(rawStep: string | null): string {
  if (rawStep === "gym-notifications" || rawStep === "gym-location") {
    return "gym-permissions";
  }
  if (rawStep === "1rm") return "body";
  if (!rawStep || rawStep === "intro") {
    return "intro";
  }
  if (rawStep === "record" || rawStep === "perf") {
    return "record";
  }
  return rawStep;
}

/**
 * Étape précédente de l'onboarding. Les navigations d'étapes sont en `replace`,
 * donc l'historique navigateur est vide : on mappe l'URL à la main.
 */
export function resolveOnboardingBackTarget(
  pathname: string,
  search: string,
): OnboardingBackTarget | null {
  if (pathname !== "/onboarding") return null;

  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const step = normalizeOnboardingStep(params.get("step"));
  const bodyQ = Math.max(0, Number.parseInt(params.get("bodyQ") ?? "0", 10) || 0);
  const intentQ = Math.max(
    0,
    Number.parseInt(params.get("intentQ") ?? "0", 10) || 0,
  );
  const fromSettings = params.get("from") === "settings";
  const reselect = params.get("reselect") === "1";

  if (step === "intro") return { kind: "stay" };
  if (step === "record") {
    return { kind: "path", to: "/onboarding?step=intent&intentQ=2" };
  }
  if (step === "body") {
    if (bodyQ <= 0) return { kind: "path", to: "/onboarding?step=intro" };
    return { kind: "path", to: `/onboarding?step=body&bodyQ=${bodyQ - 1}` };
  }
  if (step === "intent") {
    if (intentQ <= 0) {
      return { kind: "path", to: "/onboarding?step=body&bodyQ=3" };
    }
    return {
      kind: "path",
      to: `/onboarding?step=intent&intentQ=${intentQ - 1}`,
    };
  }
  if (step === "rank") {
    return { kind: "path", to: "/onboarding?step=record" };
  }
  if (step === "account" || step === "notifications") {
    return { kind: "path", to: "/onboarding?step=rank" };
  }
  if (step === "gym") {
    if (fromSettings) return { kind: "path", to: "/settings" };
    if (reselect) return { kind: "path", to: "/onboarding?step=gym-permissions" };
    return { kind: "path", to: "/onboarding?step=rank" };
  }
  if (step === "gym-permissions" || step === "gym-wait") {
    return { kind: "path", to: "/onboarding?step=gym&reselect=1" };
  }
  return { kind: "stay" };
}

export function resolveAppBackAction(options: {
  hasOpenOverlay: boolean;
  hasVisibleBackControl: boolean;
  canGoBack: boolean;
  pathname: string;
  search: string;
}): AppBackAction {
  if (options.hasOpenOverlay) return "dismiss-overlay";
  if (options.hasVisibleBackControl) return "click-back-control";

  const onboarding = resolveOnboardingBackTarget(options.pathname, options.search);
  if (onboarding?.kind === "path") return { type: "navigate", to: onboarding.to };
  if (onboarding?.kind === "stay") return "stay";

  if (options.canGoBack) return "history-back";
  if (!isAppBackExitRoute(options.pathname)) return "go-home";
  return "exit";
}

export function hasOpenOverlay(root: ParentNode): boolean {
  return OPEN_OVERLAY_SELECTORS.some((selector) => root.querySelector(selector) != null);
}

export function hasHardwareBackControl(root: ParentNode): boolean {
  return root.querySelector(HARDWARE_BACK_CONTROL_SELECTOR) != null;
}

export function clickHardwareBackControl(root: Document): boolean {
  const control = root.querySelector<HTMLElement>(HARDWARE_BACK_CONTROL_SELECTOR);
  if (!control) return false;
  control.click();
  return true;
}

export function dismissOpenOverlay(root: Document): boolean {
  if (!hasOpenOverlay(root)) return false;
  root.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  return true;
}

export function applyLocationToHistoryStack(
  stack: string[],
  navigationType: "POP" | "PUSH" | "REPLACE",
  locationKey: string,
): string[] {
  if (navigationType === "POP") {
    const idx = stack.lastIndexOf(locationKey);
    return idx >= 0 ? stack.slice(0, idx + 1) : [locationKey];
  }
  if (navigationType === "REPLACE") {
    if (stack.length === 0) return [locationKey];
    return [...stack.slice(0, -1), locationKey];
  }
  if (stack[stack.length - 1] === locationKey) return stack;
  return [...stack, locationKey];
}

export function isAppBackNavigateAction(
  action: AppBackAction,
): action is AppBackNavigateAction {
  return typeof action === "object" && action.type === "navigate";
}
