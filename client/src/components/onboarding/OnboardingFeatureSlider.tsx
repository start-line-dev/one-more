import { OnboardingSceneLeaguePromo } from "@/components/onboarding/OnboardingSceneLeaguePromo";
import { OnboardingSceneLogPerf } from "@/components/onboarding/OnboardingSceneLogPerf";
import { OnboardingSceneProgress } from "@/components/onboarding/OnboardingSceneProgress";
import { UI } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const ONBOARDING_INTRO_SLIDE_MS = 4000;

type Slide = {
    title: string;
    body: string;
    scene: (opts: { active: boolean; reduceMotion: boolean }) => ReactNode;
};

const SLIDES: Slide[] = [
    {
        title: UI.onboardingIntroSlide1Title,
        body: UI.onboardingIntroSlide1Body,
        scene: (opts) => <OnboardingSceneLogPerf {...opts} />,
    },
    {
        title: UI.onboardingIntroSlide2Title,
        body: UI.onboardingIntroSlide2Body,
        scene: (opts) => <OnboardingSceneLeaguePromo {...opts} />,
    },
    {
        title: UI.onboardingIntroSlide3Title,
        body: UI.onboardingIntroSlide3Body,
        scene: (opts) => <OnboardingSceneProgress {...opts} />,
    },
];

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(() =>
        typeof window === "undefined"
            ? false
            : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );

    useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = () => setReduced(media.matches);
        onChange();
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);

    return reduced;
}

export function OnboardingFeatureSlider() {
    const reduceMotion = usePrefersReducedMotion();
    const [index, setIndex] = useState(0);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const previousIndex = useRef(0);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const jumped = previousIndex.current === SLIDES.length - 1 && index === 0;
        previousIndex.current = index;
        el.scrollTo({
            left: index * el.clientWidth,
            behavior: jumped || reduceMotion ? "auto" : "smooth",
        });
    }, [index, reduceMotion]);

    useEffect(() => {
        if (reduceMotion) return;
        const id = window.setInterval(() => {
            setIndex((current) => (current + 1) % SLIDES.length);
        }, ONBOARDING_INTRO_SLIDE_MS);
        return () => window.clearInterval(id);
    }, [index, reduceMotion]);

    const onScroll = () => {
        const el = scrollerRef.current;
        if (!el || el.clientWidth === 0) return;
        const next = Math.round(el.scrollLeft / el.clientWidth);
        if (next !== index && next >= 0 && next < SLIDES.length) {
            setIndex(next);
        }
    };

    return (
        <div
            className="flex min-h-0 flex-1 flex-col"
            role="region"
            aria-roledescription="carousel"
            aria-label={UI.onboardingIntroCarouselA11y}
        >
            <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {SLIDES.map((slide, slideIndex) => {
                    const active = slideIndex === index;
                    return (
                        <div
                            key={slide.title}
                            className="flex w-full shrink-0 snap-center flex-col justify-center px-1"
                            aria-hidden={!active}
                        >
                            <div
                                className="pointer-events-none h-60 w-full"
                                aria-hidden
                            >
                                <div
                                    key={active ? "play" : "idle"}
                                    className="h-full min-h-0"
                                >
                                    {slide.scene({
                                        active,
                                        reduceMotion,
                                    })}
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 text-center">
                                <h2 className="font-one-more text-2xl font-semibold uppercase italic tracking-tight sm:text-3xl">
                                    {slide.title}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {slide.body}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div
                className="mt-4 flex items-center justify-center gap-2"
                role="tablist"
                aria-label={UI.onboardingIntroCarouselA11y}
            >
                {SLIDES.map((slide, slideIndex) => {
                    const selected = slideIndex === index;
                    return (
                        <button
                            key={slide.title}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-label={slide.title}
                            className={cn(
                                "size-2 rounded-full transition-colors",
                                selected ? "bg-foreground" : "bg-muted-foreground/40",
                            )}
                            onClick={() => setIndex(slideIndex)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
