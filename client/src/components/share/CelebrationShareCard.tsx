import { RankBadge } from '@/components/RankBadge'
import { ExerciseMuscleFallback } from '@/components/ExerciseImage'
import { leagueIconDropShadow } from '@/components/celebration-modal-ui'
import type { CelebrationItem } from '@/lib/celebration-queue'
import {
    leagueCelebrationRadialBackground,
    levelCelebrationRadialBackground,
    recordCelebrationGlow,
    shareCardThemeVars,
    shareStoryMeshBackground,
    shareStoryVignette,
    streakCelebrationRadialBackground,
} from '@/lib/celebration-visual'
import {
    getShareableExerciseImageUrl,
    resolvePublicAssetUrl,
} from '@/lib/exercise-share-media'
import { leagueMapFill } from '@/lib/league-colors'
import type { LeagueInfo } from '@/lib/strength-standards'
import { UI } from '@/lib/translations'
import { cn } from '@/lib/utils'
import { streakXpBonusPercent } from '@one-more/shared/streak-xp-multiplier'
import { ArrowRight, Flame, Sparkles, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'

export type CelebrationShareOpen = CelebrationItem

/** Export carré 1:1 optimisé stories / réseaux. */
export const CELEBRATION_SHARE_SIZE = 1080

const logoLockupShadow =
    'drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)]'

function formatSharePerfHero(weight: number, reps: number): string {
    return `${weight}kg×${reps}`
}

function ShareCardLogo() {
    const logoSrc = resolvePublicAssetUrl('logo-white-text.png')
    return (
        <img
            src={logoSrc}
            alt="One More"
            width={400}
            height={112}
            crossOrigin="anonymous"
            decoding="async"
            className={cn('h-[5.25rem] w-auto object-contain opacity-90', logoLockupShadow)}
        />
    )
}

function ShareStoryTopRank({ league }: { league: LeagueInfo }) {
    return (
        <div className="flex w-full justify-center">
            <RankBadge league={league} size="xl" variant="dark" className="scale-[1.35]" />
        </div>
    )
}

function ShareStoryTopLevel({ level }: { level: number }) {
    return (
        <div className="flex w-full justify-center">
            <span className="inline-flex items-center gap-3 rounded-full bg-black/40 px-8 py-3 ring-1 ring-white/20 backdrop-blur-md">
                <Sparkles className="size-9 shrink-0 text-accent" aria-hidden />
                <span className="font-one-more text-[2rem] font-bold italic tabular-nums text-white">
                    {UI.xpLevelLabel.replace('{level}', String(level))}
                </span>
            </span>
        </div>
    )
}

function ShareStoryShell({
    isDark,
    glowColor,
    meshAccent,
    radialBackground,
    topSlot,
    children,
}: {
    isDark: boolean
    glowColor: string
    meshAccent?: string
    radialBackground?: string
    topSlot?: ReactNode
    children: ReactNode
}) {
    return (
        <div
            data-share-card-root
            className="inline-block antialiased text-white"
            style={{
                ...shareCardThemeVars(isDark),
                width: CELEBRATION_SHARE_SIZE,
                height: CELEBRATION_SHARE_SIZE,
                minWidth: CELEBRATION_SHARE_SIZE,
                minHeight: CELEBRATION_SHARE_SIZE,
                color: '#ffffff',
            }}
        >
            <div
                className="relative size-full overflow-hidden"
                style={{
                    width: CELEBRATION_SHARE_SIZE,
                    height: CELEBRATION_SHARE_SIZE,
                    background: shareStoryMeshBackground(meshAccent ?? glowColor, true),
                }}
            >
                {radialBackground ? (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-90"
                        style={{ background: radialBackground }}
                    />
                ) : null}

                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ background: shareStoryVignette(glowColor) }}
                />

                <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-[38%] size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
                    style={{
                        background: `radial-gradient(circle, color-mix(in srgb, ${glowColor} 55%, transparent), transparent 68%)`,
                    }}
                />

                <div className="relative z-[1] flex size-full flex-col justify-between px-14 pb-12 pt-14">
                    {topSlot ? <div className="min-h-[4.5rem]">{topSlot}</div> : <div />}
                    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6 text-center">
                        {children}
                    </div>
                    <div className="flex justify-center">
                        <ShareCardLogo />
                    </div>
                </div>
            </div>
        </div>
    )
}

function ShareStoryExerciseThumb({
    exerciseImageUrl,
    bodyPart,
    target,
    iconColor,
}: {
    exerciseImageUrl?: string
    bodyPart?: string
    target?: string
    iconColor?: string
}) {
    const [broken, setBroken] = useState(false)
    const src = exerciseImageUrl
        ? getShareableExerciseImageUrl(exerciseImageUrl, 'square')
        : null

    useEffect(() => {
        setBroken(false)
    }, [exerciseImageUrl])

    if (src && !broken) {
        const isEmbedded = /^data:/i.test(src)
        return (
            <img
                src={src}
                alt=""
                // data-URL : pas de CORS ; sinon anonymous pour tenter le paint
                {...(isEmbedded
                    ? { decoding: 'sync' as const }
                    : {
                          crossOrigin: 'anonymous' as const,
                          decoding: 'async' as const,
                          referrerPolicy: 'no-referrer' as const,
                      })}
                className="size-56 shrink-0 rounded-3xl object-cover ring-2 ring-white/25 shadow-lg"
                onLoad={(e) => {
                    if (e.currentTarget.naturalWidth === 0) setBroken(true)
                }}
                onError={() => setBroken(true)}
            />
        )
    }

    return (
        <div
            className="flex size-56 shrink-0 items-center justify-center rounded-3xl bg-black/30 ring-2 ring-white/25 shadow-lg"
            style={iconColor ? { color: iconColor } : undefined}
        >
            <ExerciseMuscleFallback
                target={target}
                bodyPart={bodyPart}
                className="size-28 text-white/90"
            />
        </div>
    )
}

function ShareStoryHeroStat({
    icon: Icon,
    exerciseImageUrl,
    bodyPart,
    target,
    value,
    iconColor,
    iconFilter,
    valueStyle,
}: {
    icon?: LucideIcon
    exerciseImageUrl?: string
    bodyPart?: string
    target?: string
    value: ReactNode
    iconColor: string
    iconFilter?: string
    valueStyle?: CSSProperties
}) {
    const exerciseThumb =
        exerciseImageUrl &&
        getShareableExerciseImageUrl(exerciseImageUrl, 'square')
    const showMuscleThumb = exerciseThumb || bodyPart || target

    return (
        <div className="relative flex flex-col items-center gap-5">
            {showMuscleThumb ? (
                <ShareStoryExerciseThumb
                    exerciseImageUrl={exerciseImageUrl}
                    bodyPart={bodyPart}
                    target={target}
                    iconColor={iconColor}
                />
            ) : Icon ? (
                <Icon
                    className="size-24 shrink-0"
                    style={{ color: iconColor, filter: iconFilter }}
                    strokeWidth={1.35}
                    aria-hidden
                />
            ) : null}
            <div
                className="font-one-more text-[7.5rem] font-bold italic leading-[0.9] tracking-tight tabular-nums"
                style={{
                    color: iconColor,
                    ...valueStyle,
                }}
            >
                {value}
            </div>
        </div>
    )
}

function ShareStoryHeadline({
    title,
    subtitle,
}: {
    title: string
    subtitle?: string
}) {
    return (
        <div className="max-w-[90%] space-y-3">
            <h2 className="text-balance font-one-more text-[2.5rem] font-bold italic uppercase leading-tight tracking-wide text-white">
                {title}
            </h2>
            {subtitle ? (
                <p
                    className="truncate text-[2rem] font-medium capitalize leading-snug text-white/85"
                    title={subtitle}
                >
                    {subtitle}
                </p>
            ) : null}
        </div>
    )
}

function ShareStoryPerfChip({
    label,
    accentColor,
}: {
    label: string
    accentColor: string
}) {
    return (
        <span
            className="inline-flex items-center rounded-full px-8 py-3 text-[1.75rem] font-semibold tabular-nums backdrop-blur-md"
            style={{
                color: accentColor,
                backgroundColor: 'rgba(0,0,0,0.45)',
                boxShadow: `0 0 0 1px color-mix(in srgb, ${accentColor} 50%, transparent), 0 8px 32px rgba(0,0,0,0.35)`,
            }}
        >
            {label}
        </span>
    )
}

function ShareLeagueCard({
    open,
    isDark,
}: {
    open: Extract<CelebrationShareOpen, { kind: 'league' }>
    isDark: boolean
}) {
    const { exerciseName, prevLeague, nextLeague, weight, reps, exerciseImageUrl, bodyPart, target } =
        open.payload
    const glow = leagueMapFill(nextLeague.tier, isDark)

    return (
        <ShareStoryShell
            isDark={isDark}
            glowColor={glow}
            meshAccent={glow}
            radialBackground={leagueCelebrationRadialBackground(glow)}
            topSlot={<ShareStoryTopRank league={nextLeague} />}
        >
            <ShareStoryHeroStat
                exerciseImageUrl={exerciseImageUrl}
                bodyPart={bodyPart}
                target={target}
                value={formatSharePerfHero(weight, reps)}
                iconColor={glow}
                iconFilter={leagueIconDropShadow(glow)}
            />
            <ShareStoryHeadline
                title={UI.leaguePromotionCelebrationTitle}
                subtitle={exerciseName}
            />
            {!prevLeague ? (
                <p
                    className="text-[1.625rem] font-semibold"
                    style={{ color: glow }}
                >
                    {UI.leaguePromotionCelebrationFirst}
                </p>
            ) : (
                <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-black/35 px-8 py-4 ring-1 ring-white/15 backdrop-blur-md">
                    <RankBadge
                        league={prevLeague}
                        size="xl"
                        variant="dark"
                        className="opacity-85"
                    />
                    <ArrowRight
                        className="size-10 shrink-0"
                        style={{ color: glow }}
                        aria-hidden
                    />
                    <RankBadge league={nextLeague} size="xl" variant="dark" />
                </div>
            )}
        </ShareStoryShell>
    )
}

function ShareRecordCard({
    open,
    isDark,
}: {
    open: Extract<CelebrationShareOpen, { kind: 'record' }>
    isDark: boolean
}) {
    const { exerciseName, weight, reps, leagueAfter, exerciseImageUrl, bodyPart, target } = open.payload
    const glow = recordCelebrationGlow(leagueAfter, isDark)
    const perfLabel = UI.leaguePromotionCelebrationPerf
        .replace('{weight}', String(weight))
        .replace('{reps}', String(reps))

    return (
        <ShareStoryShell
            isDark={isDark}
            glowColor={glow}
            meshAccent={glow}
            radialBackground={leagueCelebrationRadialBackground(glow)}
            topSlot={
                leagueAfter ? <ShareStoryTopRank league={leagueAfter} /> : undefined
            }
        >
            <ShareStoryHeroStat
                exerciseImageUrl={exerciseImageUrl}
                bodyPart={bodyPart}
                target={target}
                value={formatSharePerfHero(weight, reps)}
                iconColor={glow}
                iconFilter={leagueIconDropShadow(glow)}
            />
            <ShareStoryHeadline
                title={UI.newRecordCelebrationTitle}
                subtitle={exerciseName}
            />
            {!leagueAfter ? (
                <ShareStoryPerfChip label={perfLabel} accentColor={glow} />
            ) : null}
        </ShareStoryShell>
    )
}

function ShareStreakCard({
    open,
    isDark,
}: {
    open: Extract<CelebrationShareOpen, { kind: 'streak' }>
    isDark: boolean
}) {
    const { current, level } = open.payload
    const bonusPercent = streakXpBonusPercent(current)
    const streakOrange = '#f97316'
    const title =
        current === 1
            ? UI.streakSheetTitleFirstDay
            : UI.streakSheetTitleStreak.replace('{days}', String(current))
    const description =
        current === 1
            ? UI.streakSheetSubtitleFirstDay
            : UI.streakSheetSubtitleStreak

    return (
        <ShareStoryShell
            isDark={isDark}
            glowColor={streakOrange}
            meshAccent={streakOrange}
            radialBackground={streakCelebrationRadialBackground()}
            topSlot={<ShareStoryTopLevel level={level} />}
        >
            <ShareStoryHeroStat
                icon={Flame}
                value={current}
                iconColor={streakOrange}
                iconFilter="drop-shadow(0 12px 36px color-mix(in srgb, #f97316 55%, transparent))"
            />
            <ShareStoryHeadline title={title} subtitle={description} />
            {bonusPercent > 0 ? (
                <span className="inline-flex items-center rounded-full border border-orange-500/60 bg-orange-500/20 px-8 py-3 text-[1.875rem] font-extrabold tabular-nums text-orange-300 backdrop-blur-md">
                    {UI.streakXpBonusLabel.replace(
                        '{percent}',
                        String(bonusPercent),
                    )}
                </span>
            ) : null}
        </ShareStoryShell>
    )
}

function ShareLevelUpCard({
    open,
    isDark,
}: {
    open: Extract<CelebrationShareOpen, { kind: 'levelup' }>
    isDark: boolean
}) {
    const { previousLevel, level, totalXp } = open.payload
    const leveledMultiple = level - previousLevel > 1
    const accent = '#dfff5e'

    return (
        <ShareStoryShell
            isDark={isDark}
            glowColor={accent}
            meshAccent={accent}
            radialBackground={levelCelebrationRadialBackground()}
            topSlot={<ShareStoryTopLevel level={level} />}
        >
            <ShareStoryHeroStat
                icon={Sparkles}
                value={level}
                iconColor={accent}
                iconFilter="drop-shadow(0 12px 36px color-mix(in srgb, #dfff5e 55%, transparent))"
                valueStyle={{ color: accent }}
            />
            <ShareStoryHeadline
                title={UI.levelUpCelebrationTitle}
                subtitle={UI.levelUpCelebrationSubtitle.replace(
                    '{level}',
                    String(level),
                )}
            />
            {leveledMultiple ? (
                <p className="flex items-center gap-4 text-[1.625rem] text-white/75">
                    <span>
                        {UI.xpLevelLabel.replace(
                            '{level}',
                            String(previousLevel),
                        )}
                    </span>
                    <ArrowRight className="size-8 shrink-0 text-accent" aria-hidden />
                    <span className="font-bold text-white">
                        {UI.xpLevelLabel.replace('{level}', String(level))}
                    </span>
                </p>
            ) : null}
            <ShareStoryPerfChip
                label={UI.xpTotalLabel.replace('{xp}', String(totalXp))}
                accentColor={accent}
            />
        </ShareStoryShell>
    )
}

export function CelebrationShareCard({
    open,
    isDark,
}: {
    open: CelebrationShareOpen
    isDark: boolean
}) {
    switch (open.kind) {
        case 'league':
            return <ShareLeagueCard open={open} isDark={isDark} />
        case 'record':
            return <ShareRecordCard open={open} isDark={isDark} />
        case 'streak':
            return <ShareStreakCard open={open} isDark={isDark} />
        case 'levelup':
            return <ShareLevelUpCard open={open} isDark={isDark} />
        default:
            return null
    }
}
