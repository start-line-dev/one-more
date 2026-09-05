import { OnboardingSceneStage } from "@/components/onboarding/OnboardingSceneStage";
import { cn } from "@/lib/utils";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

const WEIGHTS = [82, 88, 84, 96, 100];
const VIEW_W = 320;
const VIEW_H = 148;
const PAD = { top: 18, right: 18, bottom: 18, left: 18 };
const Y_MIN = 76;
const Y_MAX = 104;
const DRAW_MS = 800;

type OnboardingSceneProgressProps = {
    active: boolean;
    reduceMotion: boolean;
};

function xAt(index: number, count: number): number {
    const inner = VIEW_W - PAD.left - PAD.right;
    return PAD.left + (index / (count - 1)) * inner;
}

function yAt(weight: number): number {
    const inner = VIEW_H - PAD.top - PAD.bottom;
    return PAD.top + (1 - (weight - Y_MIN) / (Y_MAX - Y_MIN)) * inner;
}

function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return "";
    const [first, ...rest] = points;
    let d = `M ${first.x} ${first.y}`;
    for (let i = 0; i < rest.length; i++) {
        const from = i === 0 ? first : rest[i - 1];
        const to = rest[i];
        const cx = (from.x + to.x) / 2;
        d += ` C ${cx} ${from.y}, ${cx} ${to.y}, ${to.x} ${to.y}`;
    }
    return d;
}

export function OnboardingSceneProgress({
    active,
    reduceMotion,
}: OnboardingSceneProgressProps) {
    const play = active && !reduceMotion;
    const pathRef = useRef<SVGPathElement>(null);
    const [length, setLength] = useState(0);

    const points = useMemo(
        () =>
            WEIGHTS.map((weight, index) => ({
                weight,
                x: xAt(index, WEIGHTS.length),
                y: yAt(weight),
            })),
        [],
    );
    const d = useMemo(() => smoothPath(points), [points]);

    useLayoutEffect(() => {
        const el = pathRef.current;
        if (!el) return;
        setLength(el.getTotalLength());
    }, [d]);

    return (
        <OnboardingSceneStage className="flex items-center px-3 py-3">
            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="h-full w-full overflow-visible"
                aria-hidden
            >
                <path
                    ref={pathRef}
                    d={d}
                    fill="none"
                    stroke="var(--foreground)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(play && length > 0 && "onboarding-intro-chart")}
                    style={
                        length > 0
                            ? {
                                  strokeDasharray: length,
                                  strokeDashoffset: play ? length : 0,
                                  animationDuration: `${DRAW_MS}ms`,
                              }
                            : undefined
                    }
                />
                {points.map((point, index) => {
                    const isLast = index === points.length - 1;
                    return (
                        <circle
                            key={`${point.weight}-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={isLast ? 5 : 3.5}
                            fill={isLast ? "var(--accent)" : "var(--foreground)"}
                            stroke={isLast ? "var(--background)" : undefined}
                            strokeWidth={isLast ? 2 : 0}
                        />
                    );
                })}
            </svg>
        </OnboardingSceneStage>
    );
}
