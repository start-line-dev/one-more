import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function StepCard(props: {
    title: string;
    stepLabel?: string;
    progressPercent?: number;
    onBack?: () => void;
    backLabel?: string;
    backAnalyticsLabel?: string;
    onSkip?: () => void;
    skipLabel?: string;
    skipAnalyticsLabel?: string;
    animated?: boolean;
    children: ReactNode;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
}) {
    const {
        title,
        stepLabel,
        progressPercent,
        onBack,
        backLabel = "Retour",
        backAnalyticsLabel,
        onSkip,
        skipLabel = "Passer",
        skipAnalyticsLabel,
        animated = false,
        children,
        className,
        headerClassName,
        contentClassName,
    } = props;

    const showChrome =
        Boolean(onBack) ||
        Boolean(onSkip) ||
        Boolean(stepLabel) ||
        typeof progressPercent === "number";

    return (
        <div
            className={cn(
                "flex min-h-0 w-full flex-1 flex-col",
                animated &&
                "animate-in fade-in-0 slide-in-from-bottom-3 duration-300 ease-out [animation-fill-mode:both] motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-x-0 motion-reduce:translate-y-0",
                className,
            )}
        >
            <header className={cn("shrink-0 space-y-4", headerClassName)}>
                {showChrome ? (
                    <div className="flex items-center gap-3">
                        {onBack ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 -ml-2"
                                onClick={onBack}
                                aria-label={backLabel}
                                data-hardware-back=""
                                data-analytics-label={
                                    backAnalyticsLabel ?? "onboarding_back"
                                }
                            >
                                <ArrowLeft className="size-5" />
                            </Button>
                        ) : (
                            <span className="size-9 shrink-0" aria-hidden />
                        )}
                        {typeof progressPercent === "number" ? (
                            <Progress
                                value={Math.max(0, Math.min(100, progressPercent))}
                                className="h-1.5 min-w-0 flex-1 bg-card [&_[data-slot=progress-indicator]]:bg-foreground dark:[&_[data-slot=progress-indicator]]:bg-accent"
                            />
                        ) : (
                            <span className="min-w-0 flex-1" aria-hidden />
                        )}
                        {stepLabel ? (
                            <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                                {stepLabel}
                            </p>
                        ) : null}
                        {onSkip ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="shrink-0 -mr-2 rounded-full px-3 text-muted-foreground"
                                onClick={onSkip}
                                data-analytics-label={
                                    skipAnalyticsLabel ?? "onboarding_skip"
                                }
                            >
                                {skipLabel}
                            </Button>
                        ) : null}
                    </div>
                ) : null}

                <h1 className="font-one-more text-xl uppercase italic leading-tight sm:text-2xl">
                    {title}
                </h1>
            </header>

            {/* -mx-1 / p-1 : le conteneur scrollable clippe aussi en X, la marge
                negative compense le padding qui laisse respirer le focus ring. */}
            <div
                className={cn(
                    "-mx-1 mt-5 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-1",
                    contentClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
}
