import { CelebrationHeroMetric } from "@/components/celebration-modal-ui";
import { OnboardingSceneStage } from "@/components/onboarding/OnboardingSceneStage";
import { RankBadge } from "@/components/RankBadge";
import { useTheme } from "@/hooks/use-theme";
import { leagueCelebrationRadialBackground } from "@/lib/celebration-visual";
import { leagueMapFill } from "@/lib/league-colors";
import { UI } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type OnboardingSceneLeaguePromoProps = {
    active: boolean;
    reduceMotion: boolean;
};

export function OnboardingSceneLeaguePromo({
    active,
    reduceMotion,
}: OnboardingSceneLeaguePromoProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const glow = leagueMapFill("legend", isDark);
    const animate = active && !reduceMotion;

    return (
        <OnboardingSceneStage>
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: leagueCelebrationRadialBackground(glow) }}
            />
            <div
                className={cn(
                    "relative z-[1] flex h-full flex-col items-center justify-center gap-3 px-4 text-center",
                    animate && "league-promo-ring-anim",
                )}
                style={{ ["--league-glow" as string]: glow }}
            >
                <CelebrationHeroMetric
                    badge={<RankBadge rankId="legend" size="sm" />}
                    badgeClassName="!bg-transparent !p-0 !shadow-none !ring-0 !font-sans !not-italic"
                    ariaLabel={UI.leaguePromotionCelebrationTitle}
                />
                <p
                    className={cn(
                        "font-one-more text-lg font-semibold uppercase italic tracking-tight",
                        animate &&
                            "animate-in fade-in-0 slide-in-from-bottom-2 duration-350 ease-out [animation-delay:120ms] [animation-fill-mode:both]",
                    )}
                >
                    {UI.leaguePromotionCelebrationTitle}
                </p>
                <div className="flex items-center justify-center gap-1.5">
                    <RankBadge
                        rankId="diamond_3"
                        size="sm"
                        className={cn(
                            "opacity-80",
                            animate &&
                                "animate-in fade-in-0 slide-in-from-left-2 duration-300 ease-out [animation-delay:200ms] [animation-fill-mode:both]",
                        )}
                    />
                    <ArrowRight
                        className={cn(
                            "size-4 shrink-0",
                            animate && "league-promo-nudge-anim",
                        )}
                        style={{ color: glow }}
                        aria-hidden
                    />
                    <RankBadge
                        rankId="legend"
                        size="sm"
                        className={
                            animate
                                ? "animate-in fade-in-0 slide-in-from-right-2 duration-350 ease-out [animation-delay:280ms] [animation-fill-mode:both]"
                                : undefined
                        }
                    />
                </div>
            </div>
        </OnboardingSceneStage>
    );
}
