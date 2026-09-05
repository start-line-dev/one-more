import { BottomNav } from '@/components/BottomNav'
import { ConnectivityGate } from '@/components/ConnectivityGate'
import { LeaguePromotionCelebrationHost } from '@/components/LeaguePromotionCelebration'
import { NativeBackNavigation } from '@/components/NativeBackNavigation'
import { ProfileUsernameSetupHost } from '@/components/profile/ProfileUsernameSetupHost'
import { RestTimeFinishedToastHost } from '@/components/RestTimeFinishedToastHost'
import { Toaster } from '@/components/ui/sonner'
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider'
import { PageSection } from '@/components/analytics/PageSection'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { ConnectivityProvider } from '@/hooks/use-connectivity'
import { useKeyboardInset } from '@/hooks/use-keyboard-inset'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useGymGeofenceNotificationTap, useGymGeofenceSync } from '@/hooks/use-gym-geofence'
import { useRestTimerLocalNotifications, useRestTimerNotificationTap } from '@/hooks/use-rest-timer-local-notifications'
import { RealtimeProvider } from '@/hooks/use-realtime'
import { useTheme } from '@/hooks/use-theme'
import {
    extractInviteCodeFromUrl,
    persistAndNavigateToInvite,
    setupAppsFlyer,
} from '@/lib/appsflyer'
import { isOnboardingGymDevPreview, isGymPermissionsNativeContext, isOnboardingGymFromSettings, isGymReselectOnboarding } from '@/lib/onboarding-gym-dev'
import { useUserGymData } from '@/hooks/use-user-gym-data'
import {
    gymOnboardingPath,
    isGymOnboardingPendingFromApi,
    resolveGymOnboardingStep,
} from '@/lib/gym-onboarding-route'
import {
    needsOnboarding,
} from '@/lib/storage'
import { peekPendingInviteCode } from '@/lib/invite-code'
import { fetchTshirtRewardStatus, TSHIRT_REWARD_SWR_KEY } from '@/lib/rewards-api'
import { parseTshirtClaimRewardType, tshirtClaimPath } from '@/lib/tshirt-claim-route'
import { scheduleSafeAreaCssSync } from '@/lib/sync-safe-area-css'
import { routeUsesBackHeader } from '@/lib/back-header-routes'
import { getSystemBarsStyle, IMMERSIVE_FULL_BLEED_ROUTES } from '@/lib/system-bars-style'
import { cn } from '@/lib/utils'
import { AuthPage } from '@/pages/AuthPage'
import { ExerciseDetailPage } from '@/pages/ExerciseDetailPage'
import { ExerciseListPage } from '@/pages/ExerciseListPage'
import ChatPage from '@/pages/ChatPage'
import FriendProfilePage from '@/pages/FriendProfilePage'
import SessionPage from '@/pages/SessionPage'
import FriendSearchPage from '@/pages/FriendSearchPage'
import FriendsPage from '@/pages/FriendsPage'
import UserPreviewPage from '@/pages/UserPreviewPage'
import { HistoryPage } from '@/pages/HistoryPage'
import HomePage from '@/pages/HomePage'
import InviteLandingPage from '@/pages/InviteLandingPage'
import OnboardingPage from '@/pages/OnboardingPage'
import ProfilePage from '@/pages/ProfilePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TshirtClaimPage } from '@/pages/TshirtClaimPage'
import { EventAdminPage } from '@/pages/event/EventAdminPage'
import { EventLeaderboardPage } from '@/pages/event/EventLeaderboardPage'
import { WebStoreLandingGate } from '@/components/WebStoreLandingGate'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { CustomPaywallDrawer } from '@/components/paywall/CustomPaywallDrawer'
import { ReferralDrawerHost } from '@/components/referral/ReferralDrawerHost'
import { PaywallProvider } from '@/hooks/use-paywall'
import { ReferralDrawerProvider } from '@/hooks/use-referral-drawer'
import { usePurchases } from '@/hooks/use-purchases'
import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import useSWR from 'swr'


function StatsRedirect() {
    return <Navigate to="/profile" replace />
}

function PurchasesSyncHost() {
    usePurchases()
    return null
}

function AccessGate({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const auth = useAuth()
    usePushNotifications()
    useRestTimerLocalNotifications()
    useRestTimerNotificationTap()
    useGymGeofenceSync()
    useGymGeofenceNotificationTap()
    const isAuthRoute = location.pathname === '/auth'
    const isOnboardingRoute = location.pathname === '/onboarding'
    const isInviteRoute = location.pathname.startsWith('/invite/')
    const isEventRoute = location.pathname.startsWith('/event/')
    const onboardingNeeded = needsOnboarding()
    const { data: userGym, isLoading: userGymLoading } = useUserGymData()
    const onboardingStep = searchParams.get('step')
    const onboardingFrom = searchParams.get('from')
    const gymReselect = isGymReselectOnboarding(onboardingStep, searchParams.get('reselect'))
    const gymPendingApi = isGymOnboardingPendingFromApi(userGym)
    const gymGateReady = auth.status !== 'authenticated' || !userGymLoading
    const gymOnboardingStep = gymGateReady
        ? resolveGymOnboardingStep(userGym ?? null, {
              permissionsNative: isGymPermissionsNativeContext(onboardingStep),
          })
        : null
    const gymDevPreview = isOnboardingGymDevPreview(onboardingStep)
    const gymFromSettings = isOnboardingGymFromSettings(onboardingStep, onboardingFrom)
    const gymFlowComplete =
        gymGateReady &&
        resolveGymOnboardingStep(userGym ?? null, {
            permissionsNative: isGymPermissionsNativeContext(onboardingStep),
        }) === null
    const claimRewardType = parseTshirtClaimRewardType(location.pathname)
    const isTshirtClaimRoute = claimRewardType != null
    // T-shirt en parallèle du gym : redirect correctif une fois connu, pas de hold global.
    const { data: tshirtReward, isLoading: tshirtRewardLoading } = useSWR(
        auth.status === 'authenticated' && !onboardingNeeded
            ? TSHIRT_REWARD_SWR_KEY
            : null,
        fetchTshirtRewardStatus,
    )
    const pendingTshirtReward = tshirtReward?.pendingRewards?.[0] ?? null
    const tshirtGateReady =
        auth.status !== 'authenticated' ||
        onboardingNeeded ||
        !tshirtRewardLoading

    if (isEventRoute) return <>{children}</>

    if (
        gymGateReady &&
        tshirtGateReady &&
        auth.status === 'authenticated' &&
        !onboardingNeeded &&
        pendingTshirtReward
    ) {
        const expectedPath = tshirtClaimPath(pendingTshirtReward)
        if (!isTshirtClaimRoute || location.pathname !== expectedPath) {
            return <Navigate to={expectedPath} replace />
        }
    }

    if (
        gymGateReady &&
        tshirtGateReady &&
        auth.status === 'authenticated' &&
        isTshirtClaimRoute &&
        claimRewardType &&
        pendingTshirtReward !== claimRewardType &&
        !tshirtReward?.pendingRewards?.includes(claimRewardType)
    ) {
        if (pendingTshirtReward) {
            return <Navigate to={tshirtClaimPath(pendingTshirtReward)} replace />
        }
        return <Navigate to="/home" replace />
    }

    if (
        auth.status === 'authenticated' &&
        isOnboardingRoute &&
        onboardingStep === 'notifications'
    ) {
        return <>{children}</>
    }

    if (
        auth.status === 'authenticated' &&
        !onboardingNeeded &&
        isOnboardingRoute &&
        onboardingStep === 'gym' &&
        !gymFromSettings &&
        !gymReselect &&
        !gymDevPreview &&
        gymGateReady &&
        userGym
    ) {
        return <Navigate to="/home" replace />
    }

    if (
        auth.status === 'authenticated' &&
        !onboardingNeeded &&
        isOnboardingRoute &&
        !gymDevPreview &&
        !gymFromSettings &&
        !gymReselect &&
        gymFlowComplete
    ) {
        return <Navigate to="/home" replace />
    }

    if (auth.status !== 'authenticated') {
        const allowOnboardingRoute = onboardingNeeded || gymDevPreview
        if (allowOnboardingRoute) {
            if (isAuthRoute && peekPendingInviteCode()) {
                return <Navigate to="/onboarding" replace />
            }
            if (isOnboardingRoute || isAuthRoute || isInviteRoute) return <>{children}</>
            return <Navigate to="/onboarding" replace />
        }
        if (isAuthRoute || isInviteRoute) return <>{children}</>
        const redirect = encodeURIComponent(
            `${location.pathname}${location.search}${location.hash}`,
        )
        return <Navigate to={`/auth?redirect=${redirect}`} replace />
    }

    if (gymGateReady && auth.status === 'authenticated' && gymPendingApi) {
        if (
            isOnboardingRoute &&
            (onboardingStep === 'gym-wait' ||
                (onboardingStep === 'gym-permissions' && onboardingNeeded) ||
                gymDevPreview ||
                gymFromSettings ||
                gymReselect)
        ) {
            return <>{children}</>
        }
        return <Navigate to={gymOnboardingPath('gym-wait')} replace />
    }

    if (auth.status === 'authenticated' && isAuthRoute) {
        if (onboardingNeeded) {
            return <Navigate to="/onboarding" replace />
        }
        return <Navigate to="/home" replace />
    }

    if (
        gymGateReady &&
        auth.status === 'authenticated' &&
        onboardingNeeded &&
        location.pathname !== '/onboarding' &&
        !isAuthRoute
    ) {
        if (gymOnboardingStep) {
            return <Navigate to={gymOnboardingPath(gymOnboardingStep)} replace />
        }
        return <Navigate to="/onboarding" replace />
    }
    return <>{children}</>
}

function IndexRedirect() {
    const auth = useAuth()
    const { data: userGym, isLoading: userGymLoading } = useUserGymData()

    if (needsOnboarding()) {
        return <Navigate to="/onboarding" replace />
    }
    if (auth.status !== 'authenticated') return <Navigate to="/auth" replace />
    // /home optimiste pendant le load gym ; AccessGate corrige vers gym-wait si besoin.
    if (userGymLoading) {
        return <Navigate to="/home" replace />
    }
    if (isGymOnboardingPendingFromApi(userGym)) {
        return <Navigate to={gymOnboardingPath('gym-wait')} replace />
    }
    return <Navigate to="/home" replace />
}

function BottomNavHost({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    const show =
        location.pathname === '/home' ||
        location.pathname === '/profile' ||
        location.pathname === '/stats' ||
        location.pathname === '/history' ||
        location.pathname === '/friends' ||
        location.pathname.startsWith('/friends/preview')

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div
                key={location.pathname}
                className={cn('app-scroll-viewport', show && 'pb-bottom-nav-host')}
            >
                {children}
            </div>
            {show ? <BottomNav /> : null}
        </div>
    )
}

function SafeAreaTopScrim() {
    const { pathname } = useLocation()
    if (IMMERSIVE_FULL_BLEED_ROUTES.has(pathname)) return null
    if (pathname.startsWith('/event/')) return null
    const usesBackHeader = routeUsesBackHeader(pathname)
    return (
        <div
            className={cn('safe-area-top-scrim', usesBackHeader ? 'bg-card' : 'bg-background')}
            aria-hidden
        />
    )
}

function NativeSystemBarsSync() {
    const { resolvedTheme } = useTheme()
    const { pathname } = useLocation()

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        void (async () => {
            const barStyle = getSystemBarsStyle(pathname, resolvedTheme)

            try {
                await StatusBar.setOverlaysWebView({ overlay: true })
            } catch {
                /* Android 15+ : barres gérées par SystemBars natif. */
            }

            try {
                await SystemBars.setStyle({ style: barStyle })
            } catch {
                await StatusBar.setStyle({
                    style: barStyle === SystemBarsStyle.Dark ? Style.Dark : Style.Light,
                })
            }
        })()
    }, [pathname, resolvedTheme])

    return null
}

function App() {
    useKeyboardInset()

    useEffect(() => {
        if (typeof document === 'undefined') return
        document.documentElement.dataset.platform = Capacitor.isNativePlatform()
            ? 'native'
            : 'web'
    }, [])

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        scheduleSafeAreaCssSync()

        void setupAppsFlyer()

        void CapacitorApp.getLaunchUrl().then((result) => {
            if (!result?.url) return
            const inviteCode = extractInviteCodeFromUrl(result.url)
            if (!inviteCode) return
            persistAndNavigateToInvite(inviteCode)
        })

        const handlerPromise = CapacitorApp.addListener('appUrlOpen', (event) => {
            const inviteCode = extractInviteCodeFromUrl(event.url)
            if (!inviteCode) return
            persistAndNavigateToInvite(inviteCode)
        })

        return () => {
            handlerPromise.then((handle) => handle.remove())
        }
    }, [])

    return (
        <HashRouter>
            <NativeBackNavigation />
            <WebStoreLandingGate>
                <div className="app-shell">

                <NativeSystemBarsSync />
                <SafeAreaTopScrim />
                <Toaster />
                <LeaguePromotionCelebrationHost />
                <AuthProvider>
                    <ConnectivityProvider>
                    <RestTimeFinishedToastHost />
                    <PaywallProvider>
                    <ReferralDrawerProvider>
                    <PurchasesSyncHost />
                    <CustomPaywallDrawer />
                    <ReferralDrawerHost />
                    <AnalyticsProvider>
                    <RealtimeProvider>
                    <ConnectivityGate>
                    <ProfileUsernameSetupHost />
                    <AccessGate>
                        <BottomNavHost>
                            <PageSection>
                            <Routes>
                                <Route
                                    path="/"
                                    element={
                                        <IndexRedirect />
                                    }
                                />
                                <Route path="/onboarding" element={<OnboardingPage />} />
                                <Route path="/home" element={<HomePage />} />
                                <Route path="/stats" element={<StatsRedirect />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/history" element={<HistoryPage />} />
                                <Route path="/session/:ownerUserId/:date" element={<SessionPage />} />
                                <Route path="/auth" element={<AuthPage />} />
                                <Route path="/exercises" element={<ExerciseListPage />} />
                                <Route path="/exercise/:id" element={<ExerciseDetailPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/rewards/tshirt/:rewardType" element={<TshirtClaimPage />} />
                                <Route path="/invite/:code" element={<InviteLandingPage />} />
                                <Route path="/friends" element={<FriendsPage />} />
                                <Route path="/friends/search" element={<FriendSearchPage />} />
                                <Route path="/friends/chat/:conversationId" element={<ChatPage />} />
                                <Route path="/friends/preview/:userId" element={<UserPreviewPage />} />
                                <Route path="/friends/:userId" element={<FriendProfilePage />} />
                                <Route path="/event/leaderboard" element={<EventLeaderboardPage />} />
                                <Route path="/event/admin" element={<EventAdminPage />} />

                            </Routes>
                            </PageSection>
                        </BottomNavHost>
                    </AccessGate>
                    </ConnectivityGate>
                    </RealtimeProvider>
                    </AnalyticsProvider>
                    </ReferralDrawerProvider>
                    </PaywallProvider>
                    </ConnectivityProvider>
                </AuthProvider>
                </div>
            </WebStoreLandingGate>
        </HashRouter>
    )
}

export default App
