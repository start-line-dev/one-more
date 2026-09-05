import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { onboardingEntrance, OnboardingReveal } from '@/components/onboarding/onboarding-motion'
import { hapticSelectionChanged } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export type OnboardingChoiceOption<T extends string> = {
    id: T
    label: string
    hint?: string
    Icon?: LucideIcon
    analyticsLabel: string
}

interface OnboardingChoiceListProps<T extends string> {
    value: T
    options: OnboardingChoiceOption<T>[]
    onChange: (value: T) => void
    ariaLabel: string
}

export function OnboardingChoiceList<T extends string>({
    value,
    options,
    onChange,
    ariaLabel,
}: OnboardingChoiceListProps<T>) {
    return (
        <OnboardingReveal delayMs={160}>
            <div className="flex flex-col gap-3" role="radiogroup" aria-label={ariaLabel}>
                {options.map(({ id, label, hint, Icon, analyticsLabel }, index) => {
                    const selected = value === id
                    return (
                        <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            data-analytics-label={analyticsLabel}
                            onClick={() => {
                                if (!selected) void hapticSelectionChanged()
                                onChange(id)
                            }}
                            className={onboardingEntrance(
                                'w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                'animate-in fade-in-0 slide-in-from-bottom-2 duration-350',
                            )}
                            style={{
                                animationDelay: `${120 + index * 60}ms`,
                            }}
                        >
                            <Card
                                className={cn(
                                    'flex-row items-center gap-3 px-4 py-4 transition-colors',
                                    selected
                                        ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
                                        : 'hover:bg-muted/40',
                                )}
                            >
                                {Icon ? (
                                    <Icon
                                        className={cn(
                                            'size-6 shrink-0 stroke-[1.75]',
                                            selected ? 'text-accent' : 'text-muted-foreground',
                                        )}
                                        aria-hidden
                                    />
                                ) : null}
                                <CardHeader className="min-w-0 flex-1 gap-0.5 p-0">
                                    <CardTitle className="text-base font-semibold">
                                        {label}
                                    </CardTitle>
                                    {hint ? (
                                        <p className="text-sm text-muted-foreground">
                                            {hint}
                                        </p>
                                    ) : null}
                                </CardHeader>
                                <span
                                    className={cn(
                                        'size-5 shrink-0 rounded-full border-2',
                                        selected
                                            ? 'border-accent bg-accent'
                                            : 'border-muted-foreground/40',
                                    )}
                                    aria-hidden
                                />
                            </Card>
                        </button>
                    )
                })}
            </div>
        </OnboardingReveal>
    )
}
