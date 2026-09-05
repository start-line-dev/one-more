import { ExerciseImage } from "@/components/ExerciseImage";
import { OnboardingSceneStage } from "@/components/onboarding/OnboardingSceneStage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ONBOARDING_STARTER_EXERCISES,
    onboardingExerciseGifUrl,
} from "@/lib/onboarding-starter-exercises";
import { UI, translateBodyPart } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";

const DEMO_EXERCISE = ONBOARDING_STARTER_EXERCISES[0];
const DEMO_GIF_URL = onboardingExerciseGifUrl(DEMO_EXERCISE.exerciseId);
const WEIGHTS = [80, 100];
const REPS = [5, 5];
const ITEM_WIDTH = 40;
const TAP_MS = 650;
const DRAWER_MS = 820;
const VALUE_MS = 1550;
const SAVE_MS = 2300;

type Phase = "card" | "tap" | "drawer" | "saved";

type OnboardingSceneLogPerfProps = {
    active: boolean;
    reduceMotion: boolean;
};

function DemoWheel({
    label,
    unit,
    options,
    value,
}: {
    label: string;
    unit?: string;
    options: number[];
    value: number;
}) {
    const unique = [...new Set(options)];
    const index = Math.max(0, unique.indexOf(value));

    return (
        <div className="flex w-full flex-col items-center gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">
                {unit ? `${label} (${unit})` : label}
            </span>
            <div className="relative w-full font-one-more">
                <div className="flex h-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_22%,black_78%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_22%,black_78%,transparent)]">
                    <div
                        className="flex transition-transform duration-300 ease-out"
                        style={{
                            transform: `translateX(calc(50% - ${index * ITEM_WIDTH + ITEM_WIDTH / 2}px))`,
                        }}
                    >
                        {unique.map((opt) => (
                            <div
                                key={opt}
                                className={cn(
                                    "flex shrink-0 items-center justify-center font-semibold tabular-nums",
                                    opt === value
                                        ? "text-transparent text-lg"
                                        : "text-xs text-muted-foreground/50",
                                )}
                                style={{ width: ITEM_WIDTH, height: 40 }}
                            >
                                {opt}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex h-9 w-14 items-center justify-center rounded-xl border border-border/70 bg-secondary text-lg font-semibold tabular-nums">
                        {value}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function OnboardingSceneLogPerf({
    active,
    reduceMotion,
}: OnboardingSceneLogPerfProps) {
    const play = active && !reduceMotion;
    const [phase, setPhase] = useState<Phase>("saved");
    const [valueIndex, setValueIndex] = useState(1);

    useEffect(() => {
        if (!play) {
            setPhase("saved");
            setValueIndex(1);
            return;
        }
        setPhase("card");
        setValueIndex(0);
        const timers = [
            window.setTimeout(() => setPhase("tap"), TAP_MS),
            window.setTimeout(() => setPhase("drawer"), DRAWER_MS),
            window.setTimeout(() => setValueIndex(1), VALUE_MS),
            window.setTimeout(() => setPhase("saved"), SAVE_MS),
        ];
        return () => timers.forEach((id) => window.clearTimeout(id));
    }, [play]);

    const drawerOpen = phase === "drawer" || phase === "saved";
    const saved = phase === "saved";
    const weight = WEIGHTS[valueIndex] ?? 100;
    const reps = REPS[valueIndex] ?? 5;

    return (
        <OnboardingSceneStage className="relative">
            <div className="flex h-full items-center px-2.5">
                <div className="flex w-full items-center gap-2.5 rounded-xl border bg-background px-2.5 py-2">
                    <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <ExerciseImage
                            gifUrl={DEMO_GIF_URL}
                            bodyPart={DEMO_EXERCISE.bodyPart}
                            target={DEMO_EXERCISE.target}
                            className="size-full"
                            imgClassName="size-full object-cover"
                            fallbackIconClassName="size-6 text-muted-foreground"
                        />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        <p className="truncate font-one-more text-[11px] uppercase italic leading-none">
                            {DEMO_EXERCISE.name}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                            {translateBodyPart(DEMO_EXERCISE.bodyPart)}
                        </Badge>
                    </div>
                    <Button
                        type="button"
                        size="icon"
                        variant="default"
                        className={cn(
                            "relative size-9 shrink-0 rounded-full transition-transform duration-150",
                            phase === "tap" && "scale-90",
                        )}
                        tabIndex={-1}
                        haptic={false}
                        aria-label={UI.newPerf}
                    >
                        {play && phase === "card" ? (
                            <span className="absolute inset-0 animate-ping rounded-full bg-primary/35" />
                        ) : null}
                        <Plus className="relative size-4" aria-hidden />
                    </Button>
                </div>
            </div>

            {drawerOpen ? (
                <div
                    className={cn(
                        "absolute inset-x-0 bottom-0 rounded-t-lg border-t bg-background pb-2",
                        play &&
                            phase !== "saved" &&
                            "animate-in fade-in-0 slide-in-from-bottom-6 duration-300 ease-out [animation-fill-mode:both]",
                    )}
                >
                    <div className="bg-muted mx-auto mt-2 h-1.5 w-[80px] rounded-full" />
                    <div className="space-y-2 px-3 pt-2">
                        <p className="text-center font-one-more text-xs uppercase italic">
                            {UI.newPerf}
                        </p>
                        <div className="flex w-full flex-col items-center gap-2">
                            <DemoWheel
                                label={UI.weight}
                                unit="kg"
                                options={WEIGHTS}
                                value={weight}
                            />
                            <DemoWheel
                                label={UI.reps}
                                options={REPS}
                                value={reps}
                            />
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            tabIndex={-1}
                            haptic={false}
                            aria-label={UI.save}
                        >
                            {saved ? (
                                <Check
                                    className="size-4 celebration-count-anim"
                                    strokeWidth={2.5}
                                    aria-hidden
                                />
                            ) : (
                                UI.save
                            )}
                        </Button>
                    </div>
                </div>
            ) : null}
        </OnboardingSceneStage>
    );
}
