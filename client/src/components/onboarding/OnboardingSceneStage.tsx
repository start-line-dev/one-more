import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function OnboardingSceneStage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "relative h-full min-h-0 overflow-hidden rounded-2xl border bg-card shadow-sm",
                className,
            )}
        >
            {children}
        </div>
    );
}
