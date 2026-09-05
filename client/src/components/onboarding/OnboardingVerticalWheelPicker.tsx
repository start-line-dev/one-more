import {
    WheelPicker,
    WheelPickerWrapper,
    type WheelPickerOption,
} from '@/components/wheel-picker/wheel-picker'
import { primeHaptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { useEffect, useMemo } from 'react'

interface OnboardingVerticalWheelPickerProps {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    unit?: string
    className?: string
}

function buildOptions(
    min: number,
    max: number,
    step: number,
): WheelPickerOption<number>[] {
    const options: WheelPickerOption<number>[] = []
    const count = Math.round((max - min) / step) + 1
    for (let i = 0; i < count; i++) {
        const v = Number((min + i * step).toFixed(step < 1 ? 1 : 0))
        if (v > max) break
        options.push({
            value: v,
            label: step < 1 ? v.toFixed(1) : String(Math.round(v)),
        })
    }
    return options
}

export function OnboardingVerticalWheelPicker({
    value,
    onChange,
    min = 0,
    max = 999,
    step = 1,
    unit = '',
    className,
}: OnboardingVerticalWheelPickerProps) {
    const options = useMemo(
        () => buildOptions(min, max, step),
        [min, max, step],
    )

    useEffect(() => {
        primeHaptics()
    }, [])

    const displayValue = step < 1 ? value.toFixed(1) : String(Math.round(value))

    return (
        <div className={cn('flex flex-col items-center gap-6', className)}>
            <p className="text-center">
                <span className="font-one-more text-5xl font-bold italic tabular-nums sm:text-6xl">
                    {displayValue}
                </span>
                {unit ? (
                    <span className="ml-2 text-lg text-muted-foreground">
                        {unit}
                    </span>
                ) : null}
            </p>

            <WheelPickerWrapper className="h-56 w-full max-w-xs border-0 bg-transparent px-0">
                <WheelPicker
                    options={options}
                    value={value}
                    onValueChange={onChange}
                    classNames={{
                        optionItem:
                            'text-base text-muted-foreground/50 font-one-more italic',
                        highlightItem:
                            'text-xl font-bold text-foreground font-one-more italic',
                    }}
                />
            </WheelPickerWrapper>
        </div>
    )
}
