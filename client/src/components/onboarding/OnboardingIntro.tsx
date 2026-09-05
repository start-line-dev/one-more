import logoTextLight from "@/assets/logo-text.png";
import { OnboardingFeatureSlider } from "@/components/onboarding/OnboardingFeatureSlider";
import { onboardingEntrance } from "@/components/onboarding/onboarding-motion";
import { Trackable } from "@/components/analytics/Trackable";
import { Button } from "@/components/ui/button";
import { OnboardingSteps } from "@/lib/analytics";
import { UI } from "@/lib/translations";

/**
 * Hero landing store (hors funnel app).
 */
export function OnboardingPresentationHero() {
    return (
        <>
            <header className="flex shrink-0 px-4 pt-4">
                <img
                    src={logoTextLight}
                    alt="One More"
                    className={onboardingEntrance(
                        "h-14 w-auto select-none object-contain brightness-0 sm:h-16 animate-in fade-in-0 slide-in-from-left-4 duration-400 dark:brightness-100",
                    )}
                    loading="eager"
                    decoding="async"
                />
            </header>

            <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-4">
                <div className="flex flex-1 flex-col justify-center space-y-5 py-6">
                    <h1
                        aria-label={UI.onboardingTitle}
                        className="font-one-more text-[clamp(2.15rem,9.2vw,3.25rem)] font-semibold uppercase italic leading-[0.95] tracking-tight"
                    >
                        <span
                            className={onboardingEntrance(
                                "block animate-in fade-in-0 slide-in-from-left-4 duration-400",
                            )}
                            style={{ animationDelay: "140ms" }}
                        >
                            {UI.onboardingTitleLine1}
                        </span>
                        <span
                            className={onboardingEntrance(
                                "mt-1 inline-block w-fit bg-accent px-1.5 text-accent-foreground animate-in fade-in-0 slide-in-from-left-4 duration-400",
                            )}
                            style={{ animationDelay: "200ms" }}
                        >
                            {UI.onboardingTitleLine2}
                        </span>
                    </h1>
                    <p
                        className={onboardingEntrance(
                            "max-w-md text-base leading-relaxed text-foreground/90 animate-in fade-in-0 slide-in-from-left-3 duration-350 [animation-delay:360ms]",
                        )}
                    >
                        {UI.onboardingDescription}
                    </p>
                </div>
            </div>
        </>
    );
}

type OnboardingIntroProps = {
    onContinue: () => void;
    onHasAccount: () => void;
};

export function OnboardingIntro({ onContinue, onHasAccount }: OnboardingIntroProps) {
    return (
        <Trackable
            section="onboarding"
            feature={OnboardingSteps.INTRO}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
            <header className="flex shrink-0 justify-center px-4 pt-4">
                <img
                    src={logoTextLight}
                    alt="One More"
                    className={onboardingEntrance(
                        "h-14 w-auto select-none object-contain brightness-0 sm:h-16 animate-in fade-in-0 slide-in-from-bottom-3 duration-400 dark:brightness-100",
                    )}
                    loading="eager"
                    decoding="async"
                />
            </header>

            <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-4 py-3">
                <OnboardingFeatureSlider />
            </div>

            <footer className="shrink-0 px-4 pb-4">
                <div
                    className={onboardingEntrance(
                        "mx-auto w-full max-w-lg animate-in fade-in-0 slide-in-from-bottom-3 duration-400 [animation-delay:200ms]",
                    )}
                >
                    <Button
                        variant="accent"
                        className="w-full"
                        data-analytics-label="onboarding_intro_continue"
                        onClick={onContinue}
                    >
                        {UI.onboardingIntroCta}
                    </Button>
                    <Button
                        type="button"
                        variant="link"
                        className="mt-3 w-full text-xs text-foreground/80"
                        data-analytics-label="onboarding_intro_has_account"
                        onClick={onHasAccount}
                    >
                        {UI.switchToLogin}
                    </Button>
                </div>
            </footer>
        </Trackable>
    );
}
