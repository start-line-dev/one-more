import { BackHeader } from '@/components/BackHeader'
import { GymSettingsCard } from '@/components/settings/GymSettingsCard'
import { NotificationSettingsCard } from '@/components/settings/NotificationSettingsCard'
import { RestTimeSettingsCard } from '@/components/settings/RestTimeSettingsCard'
import { PremiumSettingsCard } from '@/components/settings/PremiumSettingsCard'
import { SettingsBuildInfo } from '@/components/settings/SettingsBuildInfo'
import { SettingsReferralLinkCard } from '@/components/settings/SettingsReferralLinkCard'
import { ProfileNameDialog } from '@/components/profile/ProfileNameDialog'
import { FeedbackKindToggle } from '@/components/settings/FeedbackKindToggle'
import { SettingsProfileSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useProfileDataRefresh, useUserProfileData } from '@/hooks/use-api-data'
import { useTheme } from '@/hooks/use-theme'
import {
    submitFeedback,
    type FeedbackKind,
} from '@/lib/feedback-api'
import { openStoreListing } from '@/lib/app-review'
import type {
    SessionsPerWeekBand,
    TrainingExperienceLevel,
    TrainingGoal,
} from '@/types'
import { setUserProfileAndWait } from '@/lib/storage'
import { UI } from '@/lib/translations'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

export function SettingsPage() {
    const auth = useAuth()
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const { theme, setTheme } = useTheme()
    const { data: profile } = useUserProfileData()
    const refreshProfile = useProfileDataRefresh()
    const [weightKg, setWeightKg] = useState<string>('')
    const [heightCm, setHeightCm] = useState<string>('')
    const [gender, setGender] = useState<'male' | 'female'>('male')
    const [ageYears, setAgeYears] = useState<string>('')
    const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>('muscle')
    const [trainingExperience, setTrainingExperience] =
        useState<TrainingExperienceLevel>('beginner')
    const [sessionsPerWeek, setSessionsPerWeek] =
        useState<SessionsPerWeekBand>('moderate')
    const [profileHydrated, setProfileHydrated] = useState(false)
    const [nameDialogOpen, setNameDialogOpen] = useState(false)
    const [feedbackOpen, setFeedbackOpen] = useState(false)
    const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>('bug')
    const [feedbackTitle, setFeedbackTitle] = useState('')
    const [feedbackMessage, setFeedbackMessage] = useState('')
    const [feedbackSending, setFeedbackSending] = useState(false)

    useEffect(() => {
        if (!profile) return
        const p = profile
        setWeightKg(String(p.weightKg))
        setHeightCm(String(p.heightCm))
        setGender(p.gender)
        setAgeYears(p.ageYears != null ? String(p.ageYears) : '')
        if (p.trainingGoal) setTrainingGoal(p.trainingGoal)
        if (p.trainingExperience) setTrainingExperience(p.trainingExperience)
        if (p.sessionsPerWeek) setSessionsPerWeek(p.sessionsPerWeek)
        setProfileHydrated(true)
    }, [profile])

    useEffect(() => {
        if (searchParams.get('focus') !== 'rest-time') return
        const el = document.getElementById('rest-time-settings')
        if (!el) return
        const timer = window.setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)
        return () => window.clearTimeout(timer)
    }, [searchParams])

    const handleSave = () => {
        const w = parseFloat(weightKg)
        const h = parseFloat(heightCm)
        const age = ageYears.trim() ? parseInt(ageYears, 10) : undefined
        if (!Number.isNaN(w) && w > 0 && !Number.isNaN(h) && h > 0) {
            void (async () => {
                await setUserProfileAndWait({
                    weightKg: w,
                    heightCm: h,
                    gender,
                    ageYears: age != null && !Number.isNaN(age) ? age : null,
                    trainingGoal,
                    trainingExperience,
                    sessionsPerWeek,
                })
                await refreshProfile()
            })()
        }
    }

    const handleDeleteAccount = () => {
        if (!window.confirm(UI.deleteAccountConfirm)) return

        const accountEmail = auth.user?.email ?? auth.user?.id ?? '–'
        const subject = encodeURIComponent(UI.deleteAccountEmailSubject)
        const body = encodeURIComponent(
            UI.deleteAccountEmailBody.replace('{email}', accountEmail),
        )
        window.location.href = `mailto:admin@one-more.app?subject=${subject}&body=${body}`
    }

    const resetFeedbackForm = () => {
        setFeedbackKind('bug')
        setFeedbackTitle('')
        setFeedbackMessage('')
    }

    const handleSubmitFeedback = () => {
        const trimmedTitle = feedbackTitle.trim()
        const trimmedMessage = feedbackMessage.trim()

        if (trimmedTitle.length < 3) {
            toast.error(UI.feedbackTitleMinError)
            return
        }

        if (trimmedMessage.length < 10) {
            toast.error(UI.feedbackMessageMinError)
            return
        }

        void (async () => {
            setFeedbackSending(true)
            try {
                await submitFeedback({
                    kind: feedbackKind,
                    title: trimmedTitle,
                    message: trimmedMessage,
                    context: {
                        platform: Capacitor.getPlatform() as 'web' | 'ios' | 'android',
                        route: location.pathname,
                    },
                })
                toast.success(UI.feedbackSentSuccess)
                setFeedbackOpen(false)
                resetFeedbackForm()
            } catch {
                toast.error(UI.feedbackSentError)
            } finally {
                setFeedbackSending(false)
            }
        })()
    }

    return (
        <div className="min-h-screen-app bg-background">
            <BackHeader title={UI.settings} />

            <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{UI.accountAndSync}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {UI.accountSyncDescription}
                        </p>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {auth.status === 'authenticated' ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    {UI.connectedAs}{' '}
                                    <span className="text-foreground font-medium">
                                        {auth.user?.email ?? auth.user?.id}
                                    </span>
                                </p>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => {
                                        void auth.logout()
                                    }}
                                >
                                    {UI.signOut}
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">{UI.notConnected}</p>
                                <Button asChild className="w-full">
                                    <Link to="/auth">{UI.signIn}</Link>
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {auth.status === 'authenticated' ? <NotificationSettingsCard /> : null}

                {auth.status === 'authenticated' ? <GymSettingsCard /> : null}

                <RestTimeSettingsCard />

                {auth.status === 'authenticated' ? <PremiumSettingsCard /> : null}

                {auth.status === 'authenticated' ? <SettingsReferralLinkCard /> : null}

                <Card>
                    <CardHeader>
                        <CardTitle>{UI.appearance}</CardTitle>
                        <p className="text-sm text-muted-foreground">{UI.themeDescription}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <label className="text-sm font-medium">{UI.theme}</label>
                        <Select
                            value={theme}
                            onValueChange={(v) => setTheme(v as ThemePreference)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="system">{UI.themeSystem}</SelectItem>
                                <SelectItem value="light">{UI.themeLight}</SelectItem>
                                <SelectItem value="dark">{UI.themeDark}</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {!profileHydrated ? (
                    <SettingsProfileSkeleton />
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>{UI.profile}</CardTitle>
                            <p className="text-sm text-muted-foreground">{UI.profileLeagueHint}</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <Label>{UI.profile}</Label>
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {[profile?.firstName, profile?.lastName]
                                                .filter(Boolean)
                                                .join(' ') ||
                                                (profile?.username
                                                    ? `@${profile.username}`
                                                    : UI.profileDefaultName)}
                                        </p>
                                        {profile?.username &&
                                        (profile.firstName || profile.lastName) ? (
                                            <p className="truncate text-xs text-muted-foreground">
                                                @{profile.username}
                                            </p>
                                        ) : null}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setNameDialogOpen(true)}
                                    >
                                        {UI.profileEditName}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Input
                                    id="settings-weight"
                                    label={UI.bodyWeight}
                                    type="number"
                                    inputMode="decimal"
                                    min={30}
                                    max={300}
                                    step={0.5}
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
                                    onBlur={handleSave}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Input
                                    id="settings-height"
                                    label={UI.height}
                                    type="number"
                                    inputMode="numeric"
                                    min={100}
                                    max={250}
                                    step={1}
                                    value={heightCm}
                                    onChange={(e) => setHeightCm(e.target.value)}
                                    onBlur={handleSave}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>{UI.gender}</Label>
                                <Select
                                    value={gender}
                                    onValueChange={(v) => {
                                        const nextGender = v as 'male' | 'female'
                                        setGender(nextGender)
                                        void (async () => {
                                            await setUserProfileAndWait({ gender: nextGender })
                                            await refreshProfile()
                                        })()
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">{UI.male}</SelectItem>
                                        <SelectItem value="female">{UI.female}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Input
                                    id="settings-age"
                                    label={UI.settingsAgeYears}
                                    type="number"
                                    inputMode="numeric"
                                    min={16}
                                    max={80}
                                    step={1}
                                    value={ageYears}
                                    onChange={(e) => setAgeYears(e.target.value)}
                                    onBlur={handleSave}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>{UI.settingsTrainingGoal}</Label>
                                <Select
                                    value={trainingGoal}
                                    onValueChange={(v) => {
                                        const next = v as TrainingGoal
                                        setTrainingGoal(next)
                                        void (async () => {
                                            await setUserProfileAndWait({ trainingGoal: next })
                                            await refreshProfile()
                                        })()
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="muscle">{UI.onboardingGoalMuscle}</SelectItem>
                                        <SelectItem value="strength">{UI.onboardingGoalStrength}</SelectItem>
                                        <SelectItem value="weight_loss">{UI.onboardingGoalWeightLoss}</SelectItem>
                                        <SelectItem value="athlete">{UI.onboardingGoalAthlete}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>{UI.settingsTrainingExperience}</Label>
                                <Select
                                    value={trainingExperience}
                                    onValueChange={(v) => {
                                        const next = v as TrainingExperienceLevel
                                        setTrainingExperience(next)
                                        void (async () => {
                                            await setUserProfileAndWait({ trainingExperience: next })
                                            await refreshProfile()
                                        })()
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">{UI.onboardingExperienceBeginner}</SelectItem>
                                        <SelectItem value="intermediate">{UI.onboardingExperienceIntermediate}</SelectItem>
                                        <SelectItem value="advanced">{UI.onboardingExperienceAdvanced}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>{UI.settingsTrainingFrequency}</Label>
                                <Select
                                    value={sessionsPerWeek}
                                    onValueChange={(v) => {
                                        const next = v as SessionsPerWeekBand
                                        setSessionsPerWeek(next)
                                        void (async () => {
                                            await setUserProfileAndWait({ sessionsPerWeek: next })
                                            await refreshProfile()
                                        })()
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{UI.onboardingFrequencyLow}</SelectItem>
                                        <SelectItem value="moderate">{UI.onboardingFrequencyModerate}</SelectItem>
                                        <SelectItem value="high">{UI.onboardingFrequencyHigh}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={() => {
                                handleSave()
                                toast.success('Profil sauvegardé')
                            }} className="w-full">
                                {UI.save}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>{UI.feedbackTitle}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {UI.feedbackDescription}
                        </p>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button
                            className="w-full"
                            onClick={() => setFeedbackOpen(true)}
                        >
                            {UI.feedbackOpenButton}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{UI.rateApp}</CardTitle>
                        <p className="text-sm text-muted-foreground">{UI.rateAppDescription}</p>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button
                            onClick={() => {
                                void openStoreListing()
                            }}
                            className="w-full"
                        >
                            {UI.rateNow}
                        </Button>
                    </CardContent>
                </Card>

                {auth.status === 'authenticated' && (
                    <div className="pt-6 text-center">
                        <button
                            type="button"
                            className="text-xs text-muted-foreground/50 underline-offset-2 transition-colors hover:text-muted-foreground hover:underline"
                            onClick={handleDeleteAccount}
                        >
                            {UI.deleteAccountLink}
                        </button>
                    </div>
                )}

                <SettingsBuildInfo />
            </main>

            <ProfileNameDialog
                open={nameDialogOpen}
                onOpenChange={setNameDialogOpen}
            />
            <Dialog
                open={feedbackOpen}
                onOpenChange={(open) => {
                    if (!feedbackSending) {
                        setFeedbackOpen(open)
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{UI.feedbackDialogTitle}</DialogTitle>
                        <DialogDescription>{UI.feedbackDialogDescription}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{UI.feedbackTypeLabel}</Label>
                            <FeedbackKindToggle
                                value={feedbackKind}
                                onChange={setFeedbackKind}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="feedback-title">{UI.feedbackSubjectLabel}</Label>
                            <Input
                                id="feedback-title"
                                maxLength={120}
                                value={feedbackTitle}
                                onChange={(event) => setFeedbackTitle(event.target.value)}
                                placeholder={UI.feedbackSubjectPlaceholder}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="feedback-message">{UI.feedbackMessageLabel}</Label>
                            <textarea
                                id="feedback-message"
                                rows={5}
                                maxLength={2000}
                                value={feedbackMessage}
                                onChange={(event) => setFeedbackMessage(event.target.value)}
                                placeholder={UI.feedbackMessagePlaceholder}
                                className="w-full resize-none rounded-lg bg-secondary px-3 py-2 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFeedbackOpen(false)}
                            disabled={feedbackSending}
                        >
                            {UI.cancel}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmitFeedback}
                            disabled={feedbackSending}
                        >
                            {feedbackSending ? UI.feedbackSending : UI.feedbackSend}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
