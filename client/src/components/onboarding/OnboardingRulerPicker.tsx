import { hapticSelectionChanged, primeHaptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useMemo, useRef } from 'react'

const ITEM_WIDTH = 12
const PADDING = 160

interface OnboardingRulerPickerProps {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    unit?: string
    className?: string
}

function buildOptions(min: number, max: number, step: number) {
    const options: number[] = []
    const count = Math.round((max - min) / step) + 1
    for (let i = 0; i < count; i++) {
        const v = Number((min + i * step).toFixed(step < 1 ? 1 : 0))
        if (v > max) break
        options.push(v)
    }
    return options
}

function findClosestIndex(options: number[], value: number): number {
    if (options.length === 0) return 0
    const exact = options.findIndex((o) => o === value)
    if (exact >= 0) return exact
    return options.reduce((best, o, i) =>
        Math.abs(o - value) < Math.abs(options[best] - value) ? i : best, 0)
}

export function OnboardingRulerPicker({
    value,
    onChange,
    min = 30,
    max = 300,
    step = 0.5,
    unit = 'kg',
    className,
}: OnboardingRulerPickerProps) {
    const options = useMemo(() => buildOptions(min, max, step), [min, max, step])
    const scrollRef = useRef<HTMLDivElement>(null)
    const isInternalUpdate = useRef(false)
    const isReady = useRef(false)
    const lastHapticIndex = useRef(0)

    const index = useMemo(() => findClosestIndex(options, value), [options, value])
    const clampedIndex = Math.max(0, Math.min(index, options.length - 1))

    useEffect(() => {
        lastHapticIndex.current = clampedIndex
    }, [clampedIndex])

    useEffect(() => {
        primeHaptics()
    }, [])

    const scrollToIndex = useCallback((targetIndex: number, smooth = false) => {
        const el = scrollRef.current
        if (!el || el.offsetWidth === 0) return
        const target = Math.max(0, Math.min(targetIndex, options.length - 1))
        const offset =
            PADDING + target * ITEM_WIDTH - el.offsetWidth / 2 + ITEM_WIDTH / 2
        isInternalUpdate.current = true
        isReady.current = true
        if (smooth) {
            el.scrollTo({ left: offset, behavior: 'smooth' })
        } else {
            el.scrollLeft = offset
        }
        setTimeout(() => {
            isInternalUpdate.current = false
        }, smooth ? 400 : 100)
    }, [options.length])

    const syncToValue = useCallback(() => {
        scrollToIndex(clampedIndex)
    }, [clampedIndex, scrollToIndex])

    useEffect(() => {
        syncToValue()
    }, [syncToValue])

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        const ro = new ResizeObserver(() => {
            if (el.offsetWidth > 0) isReady.current = true
            syncToValue()
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [syncToValue])

    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (
            !el ||
            options.length === 0 ||
            el.offsetWidth === 0 ||
            isInternalUpdate.current ||
            !isReady.current
        ) {
            return
        }
        const center = el.scrollLeft + el.offsetWidth / 2
        const i = Math.round((center - PADDING - ITEM_WIDTH / 2) / ITEM_WIDTH)
        const clamped = Math.max(0, Math.min(i, options.length - 1))
        if (clamped !== lastHapticIndex.current) {
            lastHapticIndex.current = clamped
            void hapticSelectionChanged()
        }
        const newValue = options[clamped]
        if (newValue !== undefined && newValue !== value) {
            onChange(newValue)
        }
    }, [options, value, onChange])

    const displayValue = step < 1 ? value.toFixed(1) : String(Math.round(value))
    const majorEvery = step < 1 ? 10 : 5

    return (
        <div className={cn('flex flex-col items-center gap-8', className)}>
            <p className="text-center">
                <span className="font-one-more text-5xl font-bold italic tabular-nums sm:text-6xl">
                    {displayValue}
                </span>
                <span className="ml-2 text-lg text-muted-foreground">{unit}</span>
            </p>

            <div className="relative w-full">
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
                    aria-hidden
                >
                    <div className="h-10 w-0.5 rounded-full bg-accent" />
                </div>
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex h-16 w-full touch-pan-x overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    <div style={{ width: PADDING, flexShrink: 0 }} aria-hidden />
                    {options.map((option) => {
                        const isMajor =
                            step < 1
                                ? Math.round(option) % majorEvery === 0
                                : Math.round(option) % majorEvery === 0
                        return (
                            <div
                                key={option}
                                className="flex shrink-0 flex-col items-center justify-end"
                                style={{ width: ITEM_WIDTH }}
                            >
                                <div
                                    className={cn(
                                        'w-px rounded-full bg-border',
                                        isMajor ? 'h-8' : 'h-4',
                                    )}
                                />
                            </div>
                        )
                    })}
                    <div style={{ width: PADDING, flexShrink: 0 }} aria-hidden />
                </div>
            </div>
        </div>
    )
}
