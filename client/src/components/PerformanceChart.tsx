import { AddPerfDrawer, type AddPerfDrawerExercise } from '@/components/AddPerfDrawer'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover'
import { formatPerfLabel } from '@/lib/history-entries'
import { UI } from '@/lib/translations'
import { cn } from '@/lib/utils'
import type { PerformanceEntry } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from 'recharts'

interface Props {
    className?: string
    entries: PerformanceEntry[]
    exercise: AddPerfDrawerExercise
    onDelete: (entryId: string) => void
    onUpdate: (entryId: string, weight: number, reps: number) => void
    onRefresh: () => void
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
    })
}

/** Regroupe les entries par jour et garde la meilleure perf (poids puis reps) */
function getBestPerDayAndAllByDate(entries: PerformanceEntry[]) {
    const allByDate = new Map<string, PerformanceEntry[]>()
    const bestByDate = new Map<string, PerformanceEntry>()
    for (const e of entries) {
        const key = e.date
        if (!allByDate.has(key)) allByDate.set(key, [])
        allByDate.get(key)!.push(e)
        const existing = bestByDate.get(key)
        if (
            !existing ||
            e.weight > existing.weight ||
            (e.weight === existing.weight && e.reps > existing.reps)
        ) {
            bestByDate.set(key, e)
        }
    }
    const bestList = [...bestByDate.values()].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    return { bestList, allByDate }
}

export function PerformanceChart({ className, entries, exercise, onDelete, onUpdate, onRefresh }: Props) {
    const [selectedPoint, setSelectedPoint] = useState<{
        fullDate: string
        allEntries: PerformanceEntry[]
        x: number
        y: number
    } | null>(null)
    const [editPerfEntry, setEditPerfEntry] = useState<PerformanceEntry | null>(null)
    const { bestList, allByDate } = getBestPerDayAndAllByDate(entries)
    const data = bestList.map((e) => ({
        date: formatDate(e.date),
        weight: e.weight,
        reps: e.reps,
        fullDate: e.date,
        allEntries: allByDate.get(e.date) ?? [],
    }))

    const lineColor = 'var(--foreground)'
    const gridColor = 'var(--border)'
    const tickColor = 'var(--muted-foreground)'

    const handleDotClick = (e: React.MouseEvent, fullDate: string, allEntries: PerformanceEntry[]) => {
        setSelectedPoint({
            fullDate,
            allEntries,
            x: e.clientX,
            y: e.clientY,
        })
    }

    const handleDelete = (entryId: string) => {
        if (confirm(UI.confirmDeletePerf)) {
            onDelete(entryId)
            onRefresh()
            setSelectedPoint((prev) =>
                prev && prev.allEntries.length <= 1
                    ? null
                    : prev
                        ? {
                            ...prev,
                            allEntries: prev.allEntries.filter((e) => e.id !== entryId),
                        }
                        : null
            )
        }
    }

    return (
        <div className={cn("h-[250px] w-full relative", className)}>
            <Popover
                open={!!selectedPoint}
                onOpenChange={(open) => !open && setSelectedPoint(null)}
            >
                {selectedPoint && (
                    <PopoverAnchor
                        style={{
                            position: 'fixed',
                            left: selectedPoint.x,
                            top: selectedPoint.y,
                            width: 1,
                            height: 1,
                        }}
                    />
                )}
                <PopoverContent
                    className="w-auto min-w-[160px] p-0 bg-popover border border-border"
                    align="center"
                    side="top"
                    sideOffset={8}
                >
                    {selectedPoint && (
                        <div className="px-3 py-2">
                            <div className="font-medium mb-2">
                                {new Date(selectedPoint.fullDate).toLocaleDateString('fr-FR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                })}
                            </div>
                            <ul className="space-y-2">
                                {[...selectedPoint.allEntries].reverse().map((entry, i) => (
                                    <li
                                        key={entry.id ?? i}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1.5"
                                    >
                                        <span className="text-sm font-medium">
                                            {formatPerfLabel(entry.weight, entry.reps)}
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                    setEditPerfEntry(entry)
                                                    setSelectedPoint(null)
                                                }}
                                                aria-label={UI.modifyPerf}
                                            >
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(entry.id)}
                                                aria-label={UI.deletePerf}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
            <AddPerfDrawer
                open={editPerfEntry !== null}
                onOpenChange={(open) => !open && setEditPerfEntry(null)}
                exercise={exercise}
                initialWeight={editPerfEntry?.weight ?? 0}
                initialReps={editPerfEntry?.reps ?? 1}
                entryId={editPerfEntry?.id}
                onUpdate={(entryId, weight, reps) => {
                    onUpdate(entryId, weight, reps)
                    onRefresh()
                    setEditPerfEntry(null)
                }}
            />
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: tickColor, fontSize: 12 }}
                        axisLine={{ stroke: gridColor }}
                        tickLine={{ stroke: gridColor }}
                    />
                    <YAxis
                        dataKey="weight"
                        unit=" kg"
                        tick={{ fill: tickColor, fontSize: 12 }}
                        axisLine={{ stroke: gridColor }}
                        tickLine={{ stroke: gridColor }}
                    />
                    <Line
                        type="monotone"
                        dataKey="weight"
                        stroke={lineColor}
                        strokeWidth={2.5}
                        dot={(props: unknown) => {
                            const { cx, cy, payload, key } = props as {
                                cx?: number
                                cy?: number
                                payload: {
                                    fullDate: string
                                    allEntries: PerformanceEntry[]
                                }
                                key?: string | number
                            }
                            if (cx == null || cy == null) return <g />
                            const { fullDate, allEntries } = payload
                            return (
                                <g
                                    key={key}
                                    onClick={(e) => handleDotClick(e, fullDate, allEntries)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={4}
                                        fill={lineColor}
                                        strokeWidth={0}
                                    />
                                </g>
                            )
                        }}
                        activeDot={(props: unknown) => {
                            const { cx, cy, payload, key } = props as {
                                cx?: number
                                cy?: number
                                payload: {
                                    fullDate: string
                                    allEntries: PerformanceEntry[]
                                }
                                key?: string | number
                            }
                            if (cx == null || cy == null) return <g />
                            const { fullDate, allEntries } = payload
                            return (
                                <g
                                    key={key}
                                    onClick={(e) => handleDotClick(e, fullDate, allEntries)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={5}
                                        fill={lineColor}
                                        stroke="var(--background)"
                                        strokeWidth={2}
                                    />
                                </g>
                            )
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
