import { cn } from '@/lib/utils'
import type { CSSProperties, ReactNode } from 'react'

export function CelebrationModalShell({
    background,
    style,
    children,
}: {
    background: string
    style?: CSSProperties
    children: ReactNode
}) {
    return (
        <div
            // flex-auto (basis: auto) : taille au contenu ; shrink si max-h parent.
            // Pas de flex-1 (basis 0) : collapse à 0px si la Dialog est en hauteur auto.
            className="relative min-h-0 w-full flex-auto overflow-x-hidden overflow-y-auto"
            style={style}
        >
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-95 dark:opacity-100"
                style={{ background }}
            />
            <div className="relative z-[1] flex flex-col items-center gap-4 px-6 pb-4 pt-14 text-center">
                {children}
            </div>
        </div>
    )
}

export function CelebrationHeroMetric({
    badge,
    badgeClassName,
    ariaLabel,
}: {
    badge: ReactNode
    badgeClassName?: string
    ariaLabel: string
}) {
    return (
        <div
            className="celebration-hero-anim relative inline-flex"
            aria-label={ariaLabel}
        >
            <span
                className={cn(
                    'celebration-count-anim inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-one-more text-sm font-bold italic tabular-nums shadow-md ring-2 ring-background',
                    badgeClassName,
                )}
            >
                {badge}
            </span>
        </div>
    )
}

export function formatPerfBadge(weight: number, reps: number): string {
    return `${weight}×${reps}`
}

export function leagueIconDropShadow(leagueColor: string): string {
    // Pas de color-mix() dans filter — jank Safari/WKWebView au premier paint.
    return `drop-shadow(0 6px 14px ${leagueColor}99)`
}
