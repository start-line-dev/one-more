import { afterEach, describe, expect, it } from "vitest";
import {
  applyLocationToHistoryStack,
  canGoBackInAppHistory,
  hasOpenOverlay,
  isAppBackExitRoute,
  resolveAppBackAction,
  resolveOnboardingBackTarget,
  setInAppHistoryDepth,
} from "./app-back-navigation";

describe("isAppBackExitRoute", () => {
  it("autorise la sortie sur accueil et auth standalone", () => {
    expect(isAppBackExitRoute("/home")).toBe(true);
    expect(isAppBackExitRoute("/auth")).toBe(true);
    expect(isAppBackExitRoute("/")).toBe(true);
  });

  it("ne quitte pas depuis l'onboarding ni un onglet", () => {
    expect(isAppBackExitRoute("/onboarding")).toBe(false);
    expect(isAppBackExitRoute("/profile")).toBe(false);
    expect(isAppBackExitRoute("/history")).toBe(false);
    expect(isAppBackExitRoute("/friends")).toBe(false);
    expect(isAppBackExitRoute("/settings")).toBe(false);
    expect(isAppBackExitRoute("/exercises")).toBe(false);
    expect(isAppBackExitRoute("/exercise/abc")).toBe(false);
  });
});

describe("resolveOnboardingBackTarget", () => {
  it("reste sur l'intro sans quitter", () => {
    expect(resolveOnboardingBackTarget("/onboarding", "")).toEqual({
      kind: "stay",
    });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=intro"),
    ).toEqual({ kind: "stay" });
  });

  it("remonte record, body, intent, rank et account", () => {
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=record"),
    ).toEqual({ kind: "path", to: "/onboarding?step=intent&intentQ=2" });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=body&bodyQ=0"),
    ).toEqual({ kind: "path", to: "/onboarding?step=intro" });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=body&bodyQ=1"),
    ).toEqual({ kind: "path", to: "/onboarding?step=body&bodyQ=0" });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=body&bodyQ=3"),
    ).toEqual({ kind: "path", to: "/onboarding?step=body&bodyQ=2" });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=intent&intentQ=0"),
    ).toEqual({ kind: "path", to: "/onboarding?step=body&bodyQ=3" });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=intent&intentQ=2"),
    ).toEqual({ kind: "path", to: "/onboarding?step=intent&intentQ=1" });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=rank"),
    ).toEqual({ kind: "path", to: "/onboarding?step=record" });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=account"),
    ).toEqual({ kind: "path", to: "/onboarding?step=rank" });
  });

  it("remonte le parcours salle sans fermer l'app", () => {
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=gym"),
    ).toEqual({ kind: "path", to: "/onboarding?step=rank" });
    expect(
      resolveOnboardingBackTarget(
        "/onboarding",
        "?step=gym-permissions",
      ),
    ).toEqual({ kind: "path", to: "/onboarding?step=gym&reselect=1" });
    expect(
      resolveOnboardingBackTarget("/onboarding", "?step=gym-wait"),
    ).toEqual({ kind: "path", to: "/onboarding?step=gym&reselect=1" });
    expect(
      resolveOnboardingBackTarget(
        "/onboarding",
        "?step=gym&from=settings",
      ),
    ).toEqual({ kind: "path", to: "/settings" });
  });
});

describe("resolveAppBackAction", () => {
  const base = {
    hasOpenOverlay: false,
    hasVisibleBackControl: false,
    canGoBack: false,
    pathname: "/home",
    search: "",
  };

  it("ferme d'abord un overlay ouvert", () => {
    expect(
      resolveAppBackAction({
        ...base,
        hasOpenOverlay: true,
        canGoBack: true,
      }),
    ).toBe("dismiss-overlay");
  });

  it("clique le bouton retour visible de l'étape", () => {
    expect(
      resolveAppBackAction({
        ...base,
        hasVisibleBackControl: true,
        pathname: "/onboarding",
        search: "?step=body&bodyQ=0",
      }),
    ).toBe("click-back-control");
  });

  it("navigue vers l'étape d'onboarding précédente", () => {
    expect(
      resolveAppBackAction({
        ...base,
        pathname: "/onboarding",
        search: "?step=body&bodyQ=0",
      }),
    ).toEqual({ type: "navigate", to: "/onboarding?step=intro" });
  });

  it("reste à l'intro sans quitter l'app", () => {
    expect(
      resolveAppBackAction({
        ...base,
        pathname: "/onboarding",
        search: "?step=intro",
      }),
    ).toBe("stay");
  });

  it("navigue du record vers intent", () => {
    expect(
      resolveAppBackAction({
        ...base,
        pathname: "/onboarding",
        search: "?step=record",
      }),
    ).toEqual({ type: "navigate", to: "/onboarding?step=intent&intentQ=2" });
  });

  it("remonte l'historique in-app hors onboarding", () => {
    expect(
      resolveAppBackAction({
        ...base,
        canGoBack: true,
        pathname: "/profile",
      }),
    ).toBe("history-back");
  });

  it("renvoie vers l'accueil depuis un onglet sans historique", () => {
    expect(
      resolveAppBackAction({
        ...base,
        pathname: "/friends",
      }),
    ).toBe("go-home");
  });
});

describe("canGoBackInAppHistory", () => {
  afterEach(() => {
    setInAppHistoryDepth(0);
  });

  it("suit la profondeur de pile in-app", () => {
    setInAppHistoryDepth(1);
    expect(canGoBackInAppHistory({ idx: 0 })).toBe(false);
    setInAppHistoryDepth(2);
    expect(canGoBackInAppHistory({ idx: 0 })).toBe(true);
  });

  it("suit l'index React Router même si la pile locale est à 1", () => {
    setInAppHistoryDepth(1);
    expect(canGoBackInAppHistory({ idx: 2 })).toBe(true);
    expect(canGoBackInAppHistory({ idx: 0 })).toBe(false);
    expect(canGoBackInAppHistory(null)).toBe(false);
  });
});

describe("applyLocationToHistoryStack", () => {
  it("pousse, remplace et coupe au POP", () => {
    const pushed = applyLocationToHistoryStack(["a"], "PUSH", "b");
    expect(pushed).toEqual(["a", "b"]);

    const replaced = applyLocationToHistoryStack(["a", "b"], "REPLACE", "c");
    expect(replaced).toEqual(["a", "c"]);

    const popped = applyLocationToHistoryStack(["a", "c", "d"], "POP", "a");
    expect(popped).toEqual(["a"]);

    expect(applyLocationToHistoryStack(["a"], "PUSH", "a")).toEqual(["a"]);
  });
});

describe("hasOpenOverlay", () => {
  it("détecte un overlay présent", () => {
    const root = {
      querySelector: (selector: string) =>
        selector.includes("drawer-content") ? {} : null,
    } as unknown as ParentNode;
    expect(hasOpenOverlay(root)).toBe(true);
  });

  it("ignore un document sans overlay", () => {
    const root = {
      querySelector: () => null,
    } as unknown as ParentNode;
    expect(hasOpenOverlay(root)).toBe(false);
  });
});
