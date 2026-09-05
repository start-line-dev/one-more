import { AddPerfDrawer } from '@/components/AddPerfDrawer';
import { OnboardingShell } from '@/components/OnboardingShell';
import { StepCard } from '@/components/StepCard';
import { Trackable } from '@/components/analytics/Trackable';
import {
    OnboardingChoiceList,
    type OnboardingChoiceOption,
} from '@/components/onboarding/OnboardingChoiceList';
import { OnboardingExerciseList } from '@/components/onboarding/OnboardingExerciseList';
import { OnboardingGymPermissionsStep } from '@/components/onboarding/OnboardingGymPermissionsStep';
import { OnboardingGymStep } from '@/components/onboarding/OnboardingGymStep';
import { OnboardingGymWaitStep } from '@/components/onboarding/OnboardingGymWaitStep';
import { OnboardingIntro } from '@/components/onboarding/OnboardingIntro';
import { OnboardingNotificationsStep } from '@/components/onboarding/OnboardingNotificationsStep';
import { OnboardingRankReveal } from '@/components/onboarding/OnboardingRecordResults';
import { OnboardingRulerPicker } from '@/components/onboarding/OnboardingRulerPicker';
import { OnboardingVerticalWheelPicker } from '@/components/onboarding/OnboardingVerticalWheelPicker';
import { OnboardingReveal, OnboardingStepLayout, onboardingStepCardClassName } from '@/components/onboarding/onboarding-motion';
import { Button } from '@/components/ui/button';
import { useUserProfileData } from '@/hooks/use-api-data';
import { useAuth } from '@/hooks/use-auth';
import { useMutateUserGym, useUserGymData } from '@/hooks/use-user-gym-data';
import {
    OnboardingSteps,
    bodyStepFromQuestion,
    intentStepFromQuestion,
    trackOnboardingStepCompleted,
    trackOnboardingStepSkipped,
    useOnboardingStepViewed,
    type OnboardingStepId,
} from '@/lib/analytics';
import { unlockGymAccess } from '@/lib/gym-onboarding';
import { gymOnboardingPath, resolveGymOnboardingStep } from '@/lib/gym-onboarding-route';
import { fetchUserGym } from '@/lib/gyms-api';
import { primeHaptics } from '@/lib/haptics';
import {
    isGymPermissionsNativeContext,
    isGymReselectOnboarding,
    isOnboardingGymDevPreview,
    isOnboardingGymFromSettings,
    seedOnboardingGymDevState,
} from '@/lib/onboarding-gym-dev';
import {
    defaultOnboardingPerf,
    findOnboardingStarterExercise,
    onboardingExerciseGifUrl,
    onboardingTrackedId,
    type OnboardingStarterExercise,
} from '@/lib/onboarding-starter-exercises';
import { continueAfterOnboardingNotifications, isOnboardingNotificationsPath, ONBOARDING_NOTIFICATIONS_STEP_ENABLED, postAuthNavigateOptions, resolvePostAuthNavigation } from '@/lib/post-auth-navigation';
import {
    beginOnboardingDraftSession,
    clearPendingOnboardingRecord,
    discardPendingOnboardingDrafts,
    getGymOnboardingContext,
    getOnboardingPostAuthRedirect,
    getUserProfile,
    hasOnboardingDraftSession,
    hasPersistedUserProfile,
    markOnboardingDone,
    peekPendingOnboardingRecord,
    setGymPermissionsPromptDone,
    setOnboardingFirstExercisePending,
    setOnboardingPostAuthRedirect,
    setPendingOnboardingProfile,
    setPendingOnboardingRecord,
    setUserProfile,
} from '@/lib/storage';
import { getLeagueInfo } from '@/lib/strength-standards';
import { UI } from '@/lib/translations';
import type {
    SessionsPerWeekBand,
    TrainingExperienceLevel,
    TrainingGoal,
} from '@/types';
import { AuthPage } from '@/pages/AuthPage';
import {
    Dumbbell,
    Mars,
    Scale,
    Timer,
    Trophy,
    Venus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

const BODY_TOTAL = 4
const INTENT_TOTAL = 3

const GENDER_CHOICES: OnboardingChoiceOption<'male' | 'female'>[] = [
    { id: 'male', label: UI.male, Icon: Mars, analyticsLabel: 'onboarding_gender_male' },
    { id: 'female', label: UI.female, Icon: Venus, analyticsLabel: 'onboarding_gender_female' },
]

const GOAL_CHOICES: OnboardingChoiceOption<TrainingGoal>[] = [
    { id: 'muscle', label: UI.onboardingGoalMuscle, Icon: Dumbbell, analyticsLabel: 'onboarding_goal_muscle' },
    { id: 'strength', label: UI.onboardingGoalStrength, Icon: Trophy, analyticsLabel: 'onboarding_goal_strength' },
    { id: 'weight_loss', label: UI.onboardingGoalWeightLoss, Icon: Scale, analyticsLabel: 'onboarding_goal_weight_loss' },
    { id: 'athlete', label: UI.onboardingGoalAthlete, Icon: Timer, analyticsLabel: 'onboarding_goal_athlete' },
]

const EXPERIENCE_CHOICES: OnboardingChoiceOption<TrainingExperienceLevel>[] = [
    { id: 'beginner', label: UI.onboardingExperienceBeginner, hint: UI.onboardingExperienceBeginnerHint, analyticsLabel: 'onboarding_experience_beginner' },
    { id: 'intermediate', label: UI.onboardingExperienceIntermediate, hint: UI.onboardingExperienceIntermediateHint, analyticsLabel: 'onboarding_experience_intermediate' },
    { id: 'advanced', label: UI.onboardingExperienceAdvanced, hint: UI.onboardingExperienceAdvancedHint, analyticsLabel: 'onboarding_experience_advanced' },
]

const FREQUENCY_CHOICES: OnboardingChoiceOption<SessionsPerWeekBand>[] = [
    { id: 'low', label: UI.onboardingFrequencyLow, hint: UI.onboardingFrequencyLowHint, analyticsLabel: 'onboarding_frequency_low' },
    { id: 'moderate', label: UI.onboardingFrequencyModerate, hint: UI.onboardingFrequencyModerateHint, analyticsLabel: 'onboarding_frequency_moderate' },
    { id: 'high', label: UI.onboardingFrequencyHigh, hint: UI.onboardingFrequencyHighHint, analyticsLabel: 'onboarding_frequency_high' },
]

function onboardingProgressPercent(
    step: string,
    bodyQ: number,
    intentQ: number,
): number | undefined {
    if (step === 'body') return 11 + bodyQ * 11
    if (step === 'intent') return 55 + intentQ * 11
    if (step === 'record') return 88
    if (step === 'rank') return 100
    return undefined
}

function OnboardingPage() {
    const navigate = useNavigate()
    const { mutate } = useSWRConfig()
    const auth = useAuth()
    const { data: userGym, isLoading: userGymLoading } = useUserGymData()
    const mutateUserGym = useMutateUserGym()
    const { data: profile } = useUserProfileData()
    const [searchParams] = useSearchParams()
    const rawStep = searchParams.get('step')
    const normalizedStep =
        rawStep === 'gym-notifications' || rawStep === 'gym-location'
            ? 'gym-permissions'
            : rawStep
    const step =
        normalizedStep === 'body'
            ? 'body'
            : normalizedStep === 'intent'
                ? 'intent'
            : normalizedStep === 'account'
                ? 'account'
                : normalizedStep === 'gym'
                    ? 'gym'
                    : normalizedStep === 'gym-permissions'
                        ? 'gym-permissions'
                        : normalizedStep === 'gym-wait'
                            ? 'gym-wait'
                            : normalizedStep === 'notifications'
                                ? 'notifications'
                                : normalizedStep === 'rank'
                                    ? 'rank'
                                    : normalizedStep === '1rm'
                                        ? 'body'
                                        : normalizedStep === 'record' ||
                                            normalizedStep === 'perf'
                                            ? 'record'
                                            : 'intro'
    const bodyQRaw = searchParams.get('bodyQ')
    const intentQRaw = searchParams.get('intentQ')
    const fromSettings = isOnboardingGymFromSettings(
        normalizedStep,
        searchParams.get('from'),
    )
    const gymReselect = isGymReselectOnboarding(
        normalizedStep,
        searchParams.get('reselect'),
    )
    const bodyQ = Math.min(
        BODY_TOTAL - 1,
        Math.max(0, Number.parseInt(bodyQRaw ?? '0', 10) || 0),
    )
    const intentQ = Math.min(
        INTENT_TOTAL - 1,
        Math.max(0, Number.parseInt(intentQRaw ?? '0', 10) || 0),
    )
    const viewedStep =
        step === 'intro'
            ? OnboardingSteps.INTRO
            : step === 'record'
            ? OnboardingSteps.RECORD_PICK
            : step === 'rank'
                ? OnboardingSteps.RANK_REVEAL
                : step === 'body'
                    ? bodyStepFromQuestion(bodyQ)
                    : step === 'intent'
                        ? intentStepFromQuestion(intentQ)
                    : step === 'account'
                        ? OnboardingSteps.ACCOUNT_EMAIL
                        : step === 'gym'
                            ? OnboardingSteps.GYM_QUESTION
                            : step === 'gym-permissions'
                                ? OnboardingSteps.GYM_PERMISSIONS
                                : step === 'gym-wait'
                                    ? OnboardingSteps.GYM_WAIT
                                    : step === 'notifications'
                                        ? OnboardingSteps.NOTIFICATIONS
                                        : null
    useOnboardingStepViewed(
        step === 'gym' || step === 'account' ? null : viewedStep,
    )

    const goRecord = () => {
        navigate('/onboarding?step=record', { replace: true })
    }

    const goRank = () => {
        navigate('/onboarding?step=rank', { replace: true })
    }

    const goBody = (q = 0) => {
        navigate(`/onboarding?step=body&bodyQ=${q}`, { replace: true })
    }

    const goIntent = (q = 0) => {
        navigate(`/onboarding?step=intent&intentQ=${q}`, { replace: true })
    }

    const goAccount = () => {
        navigate('/onboarding?step=account', { replace: true })
    }

    const [weightKg, setWeightKg] = useState(75)
    const [heightCm, setHeightCm] = useState(175)
    const [ageYears, setAgeYears] = useState(25)
    const [gender, setGender] = useState<'male' | 'female'>('male')
    const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>('muscle')
    const [trainingExperience, setTrainingExperience] =
        useState<TrainingExperienceLevel>('beginner')
    const [sessionsPerWeek, setSessionsPerWeek] =
        useState<SessionsPerWeekBand>('moderate')
    const [unlockingGym, setUnlockingGym] = useState(false)
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
    const [perfDrawerOpen, setPerfDrawerOpen] = useState(false)
    const [perfWeight, setPerfWeight] = useState(60)
    const [perfReps, setPerfReps] = useState(5)

    const selectedExercise = selectedExerciseId
        ? findOnboardingStarterExercise(selectedExerciseId) ?? null
        : null

    const persistRecordDraft = (
        exercise: OnboardingStarterExercise,
        weight: number,
        reps: number,
    ) => {
        const existing = peekPendingOnboardingRecord()
        setPendingOnboardingRecord({
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            originalName: exercise.originalName,
            bodyPart: exercise.bodyPart,
            target: exercise.target,
            equipment: exercise.equipment,
            gifUrl: onboardingExerciseGifUrl(exercise.exerciseId),
            weight,
            reps,
            clientTrackedId: onboardingTrackedId(exercise.exerciseId),
            clientPerfId:
                existing?.exerciseId === exercise.exerciseId
                    ? existing.clientPerfId
                    : crypto.randomUUID(),
        })
    }

    useEffect(() => {
        if (step !== 'record') return
        if (!hasOnboardingDraftSession()) {
            beginOnboardingDraftSession()
            return
        }
        const draft = peekPendingOnboardingRecord()
        if (!draft) return
        setSelectedExerciseId(draft.exerciseId)
        setPerfWeight(draft.weight)
        setPerfReps(draft.reps)
    }, [step])

    useEffect(() => {
        if (step !== 'body' && step !== 'intent') return
        const p = profile ?? (hasPersistedUserProfile() ? getUserProfile() : null)
        if (!p) return
        setGender(p.gender)
        setWeightKg(p.weightKg)
        setHeightCm(p.heightCm)
        if (p.ageYears != null) setAgeYears(p.ageYears)
        if (p.trainingGoal) setTrainingGoal(p.trainingGoal)
        if (p.trainingExperience) setTrainingExperience(p.trainingExperience)
        if (p.sessionsPerWeek) setSessionsPerWeek(p.sessionsPerWeek)
    }, [profile, step])

    useEffect(() => {
        if (step !== 'body' && step !== 'intent' && step !== 'rank') return
        primeHaptics()
    }, [step])

    useEffect(() => {
        if (step !== 'rank') return
        if (selectedExercise) return
        goRecord()
        // goRecord est stable via navigate replace
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, selectedExercise])

    const canAdvanceWeight = weightKg >= 30 && weightKg <= 300
    const canAdvanceHeight = heightCm >= 100 && heightCm <= 250
    const canAdvanceAge = ageYears >= 16 && ageYears <= 80

    const profileDraft = () => ({
        weightKg,
        heightCm,
        gender,
        ageYears,
        trainingGoal,
        trainingExperience,
        sessionsPerWeek,
    })

    const persistProfileDraft = () => {
        const body = profileDraft()
        if (auth.status === 'authenticated') {
            setUserProfile(body)
        } else {
            setPendingOnboardingProfile(body)
            setUserProfile(body, { silent: true })
        }
        void mutate('profile')
    }

    const skipToAccount = (skippedStep: OnboardingStepId) => {
        clearPendingOnboardingRecord()
        persistProfileDraft()
        setOnboardingFirstExercisePending(true)
        trackOnboardingStepSkipped({
            step: skippedStep,
            reason: 'skipped_to_account',
        })
        if (auth.status === 'authenticated') {
            markOnboardingDone('/exercises')
            navigate('/exercises', { replace: true })
            return
        }
        goAccount()
    }

    const advanceBody = () => {
        if (bodyQ === 0) {
            trackOnboardingStepCompleted({
                step: OnboardingSteps.BODY_GENDER,
                gender,
            })
            goBody(1)
            return
        }
        if (bodyQ === 1) {
            if (!canAdvanceWeight) return
            trackOnboardingStepCompleted({
                step: OnboardingSteps.BODY_WEIGHT,
                weight_kg: weightKg,
            })
            goBody(2)
            return
        }
        if (bodyQ === 2) {
            if (!canAdvanceHeight) return
            persistProfileDraft()
            trackOnboardingStepCompleted({
                step: OnboardingSteps.BODY_HEIGHT,
                height_cm: heightCm,
            })
            goBody(3)
            return
        }
        if (!canAdvanceAge) return
        persistProfileDraft()
        trackOnboardingStepCompleted({
            step: OnboardingSteps.BODY_AGE,
            age_years: ageYears,
        })
        goIntent(0)
    }

    const advanceIntent = () => {
        if (intentQ === 0) {
            trackOnboardingStepCompleted({
                step: OnboardingSteps.INTENT_GOAL,
                training_goal: trainingGoal,
            })
            goIntent(1)
            return
        }
        if (intentQ === 1) {
            trackOnboardingStepCompleted({
                step: OnboardingSteps.INTENT_EXPERIENCE,
                training_experience: trainingExperience,
            })
            goIntent(2)
            return
        }
        persistProfileDraft()
        trackOnboardingStepCompleted({
            step: OnboardingSteps.INTENT_FREQUENCY,
            sessions_per_week: sessionsPerWeek,
        })
        goRecord()
    }

    const backBody = () => {
        if (bodyQ <= 0) {
            navigate('/onboarding?step=intro', { replace: true })
            return
        }
        goBody(bodyQ - 1)
    }

    const backIntent = () => {
        if (intentQ <= 0) {
            goBody(BODY_TOTAL - 1)
            return
        }
        goIntent(intentQ - 1)
    }

    const progressPercent = onboardingProgressPercent(step, bodyQ, intentQ)

    const bodyStepTitle =
        bodyQ === 0
            ? UI.onboardingBodyTitleGender
            : bodyQ === 1
                ? UI.onboardingBodyTitleWeight
                : bodyQ === 2
                    ? UI.onboardingBodyTitleHeight
                    : UI.onboardingBodyTitleAge

    const intentStepTitle =
        intentQ === 0
            ? UI.onboardingIntentTitleGoal
            : intentQ === 1
                ? UI.onboardingIntentTitleExperience
                : UI.onboardingIntentTitleFrequency

    const canSkipCurrentStep =
        (step === 'body' && bodyQ === 3) ||
        step === 'intent' ||
        step === 'record'

    const handleSkip = () => {
        if (step === 'record') {
            skipToAccount(OnboardingSteps.RECORD_PICK)
            return
        }
        if (step === 'intent') {
            skipToAccount(intentStepFromQuestion(intentQ))
            return
        }
        if (step === 'body' && bodyQ === 3) {
            skipToAccount(OnboardingSteps.BODY_AGE)
        }
    }

    const leagueInfo = useMemo(() => {
        if (!selectedExercise) return null
        return getLeagueInfo({
            weight: perfWeight,
            reps: perfReps,
            bodyWeightKg: weightKg,
            gender,
            exerciseName: selectedExercise.originalName,
            exerciseMetadata: {
                equipment: selectedExercise.equipment,
                target: selectedExercise.target,
            },
        })
    }, [selectedExercise, perfWeight, perfReps, weightKg, gender])

    const openRecordDrawer = (exercise: OnboardingStarterExercise) => {
        setSelectedExerciseId(exercise.exerciseId)
        const draft = peekPendingOnboardingRecord()
        if (draft?.exerciseId === exercise.exerciseId) {
            setPerfWeight(draft.weight)
            setPerfReps(draft.reps)
        } else {
            const defaults = defaultOnboardingPerf(exercise)
            setPerfWeight(defaults.weight)
            setPerfReps(defaults.reps)
        }
        setPerfDrawerOpen(true)
        trackOnboardingStepCompleted({
            step: OnboardingSteps.RECORD_PICK,
            exercise_id: exercise.exerciseId,
        })
    }

    const saveRecordFromDrawer = (weight: number, reps: number) => {
        const exercise =
            selectedExercise ??
            (selectedExerciseId
                ? findOnboardingStarterExercise(selectedExerciseId) ?? null
                : null)
        if (!exercise || reps <= 0) return
        setPerfWeight(weight)
        setPerfReps(reps)
        persistRecordDraft(exercise, weight, reps)
        trackOnboardingStepCompleted({
            step: OnboardingSteps.RECORD_PERF,
            exercise_id: exercise.exerciseId,
            weight,
            reps,
        })
        goRank()
    }

    const beatRecord = () => {
        if (!selectedExercise) return
        persistRecordDraft(selectedExercise, perfWeight, perfReps)
        trackOnboardingStepCompleted({
            step: OnboardingSteps.RANK_REVEAL,
            exercise_id: selectedExercise.exerciseId,
            rank: leagueInfo?.rankId,
            percentile: leagueInfo?.percentileEstimate,
        })
        void finishOnboarding('/home')
    }

    const finishOnboarding = async (nextPath: string) => {
        if (auth.status === 'authenticated') {
            setOnboardingPostAuthRedirect(null)
            const resolvedPath = await resolvePostAuthNavigation(nextPath)
            if (!isOnboardingNotificationsPath(resolvedPath)) {
                markOnboardingDone(resolvedPath)
            }
            navigate(resolvedPath, postAuthNavigateOptions(resolvedPath))
            return
        }

        setOnboardingPostAuthRedirect(nextPath)
        const redirect = encodeURIComponent('/onboarding?step=account')
        navigate(`/onboarding?step=account&mode=login&redirect=${redirect}`, {
            replace: true,
        })
    }

    const handleGymSaved = async () => {
        await mutateUserGym()
        if (fromSettings) {
            navigate('/settings', { replace: true })
            return
        }
        navigate('/onboarding?step=gym-permissions', { replace: true })
    }

    const goChangeGym = () => {
        navigate('/onboarding?step=gym&reselect=1', { replace: true })
    }

    const completeGymAfterPermissions = async () => {
        let gym: Awaited<ReturnType<typeof fetchUserGym>> | null = null
        try {
            gym = await fetchUserGym()
        } catch {
            gym = userGym ?? null
        }
        if (!gym) {
            navigate('/onboarding?step=gym', { replace: true })
            return
        }

        if (gym.onboardingGymPending) {
            navigate('/onboarding?step=gym-wait', { replace: true })
            return
        }

        setOnboardingFirstExercisePending(true)
        const nextPath = getOnboardingPostAuthRedirect() ?? '/home'
        await finishOnboarding(nextPath)
    }

    const completeGymPermissions = async () => {
        trackOnboardingStepCompleted({ step: OnboardingSteps.GYM_PERMISSIONS })
        setGymPermissionsPromptDone(true)
        await completeGymAfterPermissions()
    }

    const skipGymPermissions = async () => {
        trackOnboardingStepSkipped({
            step: OnboardingSteps.GYM_PERMISSIONS,
            reason: 'skipped',
        })
        setGymPermissionsPromptDone(true)
        await unlockGymAccess()
        setOnboardingFirstExercisePending(true)
        const nextPath = getOnboardingPostAuthRedirect() ?? '/home'
        await finishOnboarding(nextPath)
    }

    const skipGymStep = async () => {
        trackOnboardingStepSkipped({
            step: OnboardingSteps.GYM_SEARCH,
            reason: 'no_gym',
        })
        toast.message(UI.gymOnboardingSkipToast)
        setOnboardingFirstExercisePending(true)
        const nextPath = getOnboardingPostAuthRedirect() ?? '/home'
        await finishOnboarding(nextPath)
    }

    const continueAfterGymResolved = async () => {
        const nextPath = getOnboardingPostAuthRedirect() ?? '/home'
        await finishOnboarding(nextPath)
    }

    const completeNotificationsStep = (outcome: 'enabled' | 'skipped') => {
        if (outcome === 'enabled') {
            trackOnboardingStepCompleted({ step: OnboardingSteps.NOTIFICATIONS })
        } else {
            trackOnboardingStepSkipped({
                step: OnboardingSteps.NOTIFICATIONS,
                reason: 'skipped',
            })
        }
        const nextPath = continueAfterOnboardingNotifications()
        navigate(nextPath, postAuthNavigateOptions(nextPath))
    }

    const navigateToResolvedGymStep = (
        resolved: ReturnType<typeof resolveGymOnboardingStep>,
    ) => {
        if (!resolved) return false
        navigate(gymOnboardingPath(resolved), { replace: true })
        return true
    }

    const handleGymUnlock = async () => {
        trackOnboardingStepCompleted({ step: OnboardingSteps.GYM_WAIT })
        setUnlockingGym(true)
        try {
            await unlockGymAccess()
            const resolvedPath = await resolvePostAuthNavigation('/home')
            navigate(resolvedPath, postAuthNavigateOptions(resolvedPath))
        } finally {
            setUnlockingGym(false)
        }
    }

    useEffect(() => {
        if (rawStep === 'gym-notifications' || rawStep === 'gym-location') {
            navigate('/onboarding?step=gym-permissions', { replace: true })
        }
        if (rawStep === 'notifications' && !ONBOARDING_NOTIFICATIONS_STEP_ENABLED) {
            const nextPath = continueAfterOnboardingNotifications()
            navigate(nextPath, postAuthNavigateOptions(nextPath))
        }
        if (rawStep === '1rm') {
            navigate('/onboarding?step=body&bodyQ=0', { replace: true })
        }
    }, [navigate, rawStep])

    useEffect(() => {
        if (step !== 'gym-permissions' && step !== 'gym-wait') return
        if (isOnboardingGymDevPreview(step)) {
            seedOnboardingGymDevState(step)
            return
        }
        if (userGymLoading) return
        if (step === 'gym-wait') return
        if (!userGym) {
            navigate('/onboarding?step=gym', { replace: true })
        }
    }, [navigate, step, userGym, userGymLoading])

    useEffect(() => {
        if (isOnboardingGymDevPreview(step)) return
        if ((fromSettings || gymReselect) && step === 'gym') return
        if (auth.status !== 'authenticated') return
        if (userGymLoading) return
        if (
            step === 'intro' ||
            step === 'gym-permissions' ||
            step === 'gym-wait' ||
            step === 'account' ||
            step === 'notifications'
        ) {
            return
        }
        const resolved = resolveGymOnboardingStep(userGym ?? null, {
            permissionsNative: isGymPermissionsNativeContext(step),
        })
        if (resolved === 'gym-wait') {
            navigate('/onboarding?step=gym-wait', { replace: true })
            return
        }
        if (resolved === 'gym-permissions') {
            navigate('/onboarding?step=gym-permissions', { replace: true })
            return
        }
        if (resolved === null && step === 'gym' && !fromSettings) {
            void continueAfterGymResolved()
        }
        // Redir auto quand la salle est déjà résolue ; évite re-trigger sur continueAfterGymResolved.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth.status, navigate, step, fromSettings, gymReselect, userGym, userGymLoading])

    useEffect(() => {
        if (step !== 'account') return
        if (auth.status !== 'authenticated') return
        if (userGymLoading) return

        const resolved = resolveGymOnboardingStep(userGym ?? null, {
            permissionsNative: isGymPermissionsNativeContext('gym'),
        })
        if (navigateToResolvedGymStep(resolved)) return
        void continueAfterGymResolved()
        // On réagit au passage en step=account + auth + chargement salle API.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, auth.status, userGym, userGymLoading])

    useEffect(() => {
        if (step !== 'account') return
        if (auth.status === 'authenticated') return
        const mode = searchParams.get('mode')
        const currentRedirect = searchParams.get('redirect')
        if (mode === 'login' && currentRedirect === '/onboarding?step=account') {
            return
        }
        const redirect = encodeURIComponent('/onboarding?step=account')
        navigate(`/onboarding?step=account&mode=login&redirect=${redirect}`, {
            replace: true,
        })
    }, [step, auth.status, navigate, searchParams])

    return (
        <OnboardingShell>
            {step === 'intro' ? (
                <OnboardingIntro
                    onContinue={() => {
                        trackOnboardingStepCompleted({
                            step: OnboardingSteps.INTRO,
                        })
                        beginOnboardingDraftSession()
                        goBody(0)
                    }}
                    onHasAccount={() => {
                        trackOnboardingStepSkipped({
                            step: OnboardingSteps.INTRO,
                            reason: 'has_account',
                        })
                        discardPendingOnboardingDrafts()
                        void finishOnboarding('/home')
                    }}
                />
            ) : step === 'record' ? (
                <Trackable section="onboarding" feature={OnboardingSteps.RECORD_PICK}>
                    <OnboardingStepLayout>
                        <StepCard
                            className={onboardingStepCardClassName}
                            onBack={() => goIntent(INTENT_TOTAL - 1)}
                            backLabel={UI.back}
                            backAnalyticsLabel="onboarding_record_back"
                            onSkip={handleSkip}
                            skipLabel={UI.onboardingSkip}
                            skipAnalyticsLabel="onboarding_record_skip"
                            progressPercent={progressPercent}
                            title={UI.onboardingRecordTitle}
                        >
                            <OnboardingReveal delayMs={80}>
                                <p className="text-sm text-muted-foreground">
                                    {UI.onboardingRecordHint}
                                </p>
                            </OnboardingReveal>
                            <OnboardingExerciseList onSelect={openRecordDrawer} />
                            <OnboardingReveal delayMs={200}>
                                <p className="text-xs text-muted-foreground">
                                    {UI.onboardingRecordMicro}
                                </p>
                            </OnboardingReveal>
                        </StepCard>
                    </OnboardingStepLayout>
                    {selectedExercise ? (
                        <AddPerfDrawer
                            open={perfDrawerOpen}
                            onOpenChange={setPerfDrawerOpen}
                            title={UI.onboardingPerfTitle}
                            exercise={{
                                id: onboardingTrackedId(selectedExercise.exerciseId),
                                name: selectedExercise.name,
                                originalName: selectedExercise.originalName,
                                equipment: selectedExercise.equipment,
                                target: selectedExercise.target,
                            }}
                            initialWeight={perfWeight}
                            initialReps={perfReps}
                            onSave={saveRecordFromDrawer}
                        />
                    ) : null}
                </Trackable>
            ) : step === 'rank' ? (
                <Trackable section="onboarding" feature={OnboardingSteps.RANK_REVEAL}>
                    <OnboardingStepLayout>
                        <StepCard
                            className={onboardingStepCardClassName}
                            onBack={() => goRecord()}
                            backLabel={UI.back}
                            backAnalyticsLabel="onboarding_rank_back"
                            progressPercent={progressPercent}
                            title={UI.onboardingRankTitle}
                        >
                            {leagueInfo && selectedExercise ? (
                                <OnboardingRankReveal
                                    league={leagueInfo}
                                    exercise={selectedExercise}
                                    weight={perfWeight}
                                    reps={perfReps}
                                />
                            ) : null}
                            <OnboardingReveal delayMs={240} className="mt-auto space-y-2">
                                {auth.status === 'authenticated' ? null : (
                                    <p className="text-center text-xs text-muted-foreground">
                                        {UI.onboardingAccountLossHint}
                                    </p>
                                )}
                                <Button
                                    onClick={beatRecord}
                                    className="w-full"
                                    data-analytics-label={
                                        auth.status === 'authenticated'
                                            ? 'onboarding_beat_record'
                                            : 'onboarding_save_account'
                                    }
                                >
                                    {auth.status === 'authenticated'
                                        ? UI.onboardingBeatRecord
                                        : UI.onboardingSaveAccountCta}
                                </Button>
                            </OnboardingReveal>
                        </StepCard>
                    </OnboardingStepLayout>
                </Trackable>
            ) : step === 'body' ? (
                <Trackable
                    section="onboarding"
                    feature={bodyStepFromQuestion(bodyQ)}
                >
                    <OnboardingStepLayout>
                        <StepCard
                            key={`body-${bodyQ}`}
                            className={onboardingStepCardClassName}
                            onBack={backBody}
                            backLabel={UI.back}
                            backAnalyticsLabel="onboarding_body_back"
                            onSkip={canSkipCurrentStep ? handleSkip : undefined}
                            skipLabel={UI.onboardingSkip}
                            skipAnalyticsLabel="onboarding_body_skip"
                            progressPercent={progressPercent}
                            title={bodyStepTitle}
                        >
                            {bodyQ === 0 ? (
                                <OnboardingChoiceList
                                    value={gender}
                                    options={GENDER_CHOICES}
                                    onChange={setGender}
                                    ariaLabel={UI.gender}
                                />
                            ) : null}

                            {bodyQ === 1 ? (
                                <OnboardingRulerPicker
                                    value={weightKg}
                                    onChange={setWeightKg}
                                    min={30}
                                    max={300}
                                    step={0.5}
                                    unit="kg"
                                />
                            ) : null}

                            {bodyQ === 2 ? (
                                <OnboardingVerticalWheelPicker
                                    value={heightCm}
                                    onChange={setHeightCm}
                                    min={100}
                                    max={250}
                                    step={1}
                                    unit="cm"
                                />
                            ) : null}

                            {bodyQ === 3 ? (
                                <OnboardingVerticalWheelPicker
                                    value={ageYears}
                                    onChange={setAgeYears}
                                    min={16}
                                    max={80}
                                    step={1}
                                    unit="ans"
                                />
                            ) : null}

                            <OnboardingReveal delayMs={280} className="mt-auto space-y-3">
                                <p className="text-center text-xs text-muted-foreground">
                                    {UI.onboardingPrivacyHint}
                                </p>
                                <Button
                                    onClick={advanceBody}
                                    className="w-full"
                                    data-analytics-label={
                                        bodyQ === BODY_TOTAL - 1
                                            ? 'onboarding_body_continue'
                                            : 'onboarding_body_next'
                                    }
                                    disabled={
                                        (bodyQ === 1 && !canAdvanceWeight) ||
                                        (bodyQ === 2 && !canAdvanceHeight) ||
                                        (bodyQ === 3 && !canAdvanceAge)
                                    }
                                >
                                    {UI.continue}
                                </Button>
                            </OnboardingReveal>
                        </StepCard>
                    </OnboardingStepLayout>
                </Trackable>
            ) : step === 'intent' ? (
                <Trackable
                    section="onboarding"
                    feature={intentStepFromQuestion(intentQ)}
                >
                    <OnboardingStepLayout>
                        <StepCard
                            key={`intent-${intentQ}`}
                            className={onboardingStepCardClassName}
                            onBack={backIntent}
                            backLabel={UI.back}
                            backAnalyticsLabel="onboarding_intent_back"
                            onSkip={handleSkip}
                            skipLabel={UI.onboardingSkip}
                            skipAnalyticsLabel="onboarding_intent_skip"
                            progressPercent={progressPercent}
                            title={intentStepTitle}
                        >
                            {intentQ === 0 ? (
                                <OnboardingChoiceList
                                    value={trainingGoal}
                                    options={GOAL_CHOICES}
                                    onChange={setTrainingGoal}
                                    ariaLabel={UI.onboardingIntentTitleGoal}
                                />
                            ) : null}

                            {intentQ === 1 ? (
                                <OnboardingChoiceList
                                    value={trainingExperience}
                                    options={EXPERIENCE_CHOICES}
                                    onChange={setTrainingExperience}
                                    ariaLabel={UI.onboardingIntentTitleExperience}
                                />
                            ) : null}

                            {intentQ === 2 ? (
                                <OnboardingChoiceList
                                    value={sessionsPerWeek}
                                    options={FREQUENCY_CHOICES}
                                    onChange={setSessionsPerWeek}
                                    ariaLabel={UI.onboardingIntentTitleFrequency}
                                />
                            ) : null}

                            <OnboardingReveal delayMs={280} className="mt-auto space-y-3">
                                <p className="text-center text-xs text-muted-foreground">
                                    {UI.onboardingPrivacyHint}
                                </p>
                                <Button
                                    onClick={advanceIntent}
                                    className="w-full"
                                    data-analytics-label={
                                        intentQ === INTENT_TOTAL - 1
                                            ? 'onboarding_intent_continue'
                                            : 'onboarding_intent_next'
                                    }
                                >
                                    {UI.continue}
                                </Button>
                            </OnboardingReveal>
                        </StepCard>
                    </OnboardingStepLayout>
                </Trackable>
            ) : step === 'account' ? (
                <AuthPage embedded />
            ) : step === 'gym' ? (
                <OnboardingGymStep
                    fromSettings={fromSettings}
                    startAtSearch={gymReselect}
                    onSearchBack={
                        gymReselect
                            ? () => navigate('/onboarding?step=gym-permissions', { replace: true })
                            : undefined
                    }
                    onCancel={
                        fromSettings
                            ? () => navigate('/settings', { replace: true })
                            : undefined
                    }
                    onGymSaved={() => void handleGymSaved()}
                    onSkip={fromSettings ? undefined : () => void skipGymStep()}
                />
            ) : step === 'gym-permissions' ? (
                <OnboardingGymPermissionsStep
                    gymName={
                        isOnboardingGymDevPreview(step)
                            ? (getGymOnboardingContext()?.gymName ?? '')
                            : (userGym?.name ?? '')
                    }
                    gymAddress={
                        isOnboardingGymDevPreview(step) ? null : (userGym?.address ?? null)
                    }
                    onContinue={() => void completeGymPermissions()}
                    onSkip={() => void skipGymPermissions()}
                    onChangeGym={goChangeGym}
                />
            ) : step === 'gym-wait' ? (
                <OnboardingGymWaitStep
                    initialGymName={
                        isOnboardingGymDevPreview(step)
                            ? (getGymOnboardingContext()?.gymName ?? '')
                            : (userGym?.name ?? '')
                    }
                    initialGymAddress={
                        isOnboardingGymDevPreview(step) ? null : (userGym?.address ?? null)
                    }
                    onUnlock={() => void handleGymUnlock()}
                    onChangeGym={goChangeGym}
                    unlocking={unlockingGym}
                />
            ) : step === 'notifications' && ONBOARDING_NOTIFICATIONS_STEP_ENABLED ? (
                <OnboardingNotificationsStep
                    onContinue={() => completeNotificationsStep('enabled')}
                    onSkip={() => completeNotificationsStep('skipped')}
                />
            ) : null}
        </OnboardingShell>
    )
}

export default OnboardingPage
