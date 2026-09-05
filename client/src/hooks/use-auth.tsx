import type { AuthSession, AuthUser, StoredAuthSession } from "@/lib/auth";
import {
  clearStoredSession,
  loginWithEmail,
  logoutSession,
  readStoredSession,
  refreshSession,
  registerWithEmail,
  writeStoredSession,
} from "@/lib/auth";
import { trackAuthSuccess } from "@/lib/analytics";
import { syncAppsFlyerCustomerUserId } from "@/lib/appsflyer";
import {
  peekPendingAttribution,
  clearPendingAttribution,
} from "@/lib/appsflyer-attribution";
import { ApiError, setAuthSessionListener } from "@/lib/api";
import { clearPendingInviteCode, peekPendingInviteCode } from "@/lib/invite-code";
import { upsertUserAppsFlyerAttribution } from "@/lib/attribution-api";
import { purgeUserScopedClientState } from "@/lib/purge-user-scoped-state";
import {
  applyPendingOnboardingProfileAfterAuth,
  clearOnboardingDraftsAndSession,
  peekPendingOnboardingProfile,
} from "@/lib/storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";

type AuthState = {
  status: "anonymous" | "authenticated";
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
};

type AuthContextValue = AuthState & {
  register: (params: {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
    inviteCode?: string;
  }) => Promise<void>;
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  acceptSession: (session: AuthSession) => void;
  lastError: string | null;
  clearError: () => void;
  setError: (message: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionToState(session: StoredAuthSession): AuthState {
  return {
    status: "authenticated",
    user: session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { cache } = useSWRConfig();
  const [state, setState] = useState<AuthState>(() => {
    const stored = readStoredSession();
    return stored ? sessionToState(stored) : { status: "anonymous", user: null, accessToken: null, refreshToken: null };
  });
  const [lastError, setLastError] = useState<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applySession = useCallback((session: AuthSession) => {
    const current = stateRef.current;
    const switchingAuthenticatedUser =
      current.status === "authenticated" &&
      current.user?.id != null &&
      current.user.id !== session.user.id;
    const switchingUser =
      current.status === "anonymous" || switchingAuthenticatedUser;
    if (switchingAuthenticatedUser) {
      clearOnboardingDraftsAndSession();
    }
    if (switchingUser) {
      purgeUserScopedClientState(cache);
    }
    const stored: StoredAuthSession = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    };
    writeStoredSession(stored);
    const next = sessionToState(stored);
    stateRef.current = next;
    setState(next);
    void syncAppsFlyerCustomerUserId(session.user.id);

    // Sauvegarde en une fois (si dispo) l’attribution marketing reçue avant l’auth.
    void (async () => {
      const pending = peekPendingAttribution();
      if (!pending) return;
      try {
        await upsertUserAppsFlyerAttribution(pending);
        clearPendingAttribution();
      } catch {
        // Best effort: ne bloque pas l’app si l’endpoint est indisponible.
      }
    })();
  }, [cache]);

  const clearSession = useCallback(() => {
    purgeUserScopedClientState(cache);
    clearStoredSession();
    const next: AuthState = {
      status: "anonymous",
      user: null,
      accessToken: null,
      refreshToken: null,
    };
    stateRef.current = next;
    setState(next);
    void syncAppsFlyerCustomerUserId(null);
  }, [cache]);

  const clearError = useCallback(() => setLastError(null), []);
  const setError = useCallback((message: string) => setLastError(message), []);

  const normalizeError = (e: unknown): string => {
    if (e instanceof ApiError) return e.message;
    if (e instanceof Error) return e.message;
    return "Une erreur est survenue";
  };

  const register = useCallback(
    async ({
      email,
      password,
      username,
      firstName,
      lastName,
      inviteCode: inviteCodeParam,
    }: {
      email: string;
      password: string;
      username: string;
      firstName?: string;
      lastName?: string;
      inviteCode?: string;
    }) => {
      clearError();
      try {
        const inviteCode =
          inviteCodeParam?.trim() ||
          peekPendingInviteCode() ||
          undefined;
        const bodyProfile = peekPendingOnboardingProfile();
        const session = await registerWithEmail({
          email,
          password,
          username,
          inviteCode,
          firstName: firstName?.trim() || undefined,
          lastName: lastName?.trim() || undefined,
          weightKg: bodyProfile?.weightKg,
          heightCm: bodyProfile?.heightCm,
          gender: bodyProfile?.gender,
          ageYears: bodyProfile?.ageYears ?? undefined,
          trainingGoal: bodyProfile?.trainingGoal ?? undefined,
          trainingExperience: bodyProfile?.trainingExperience ?? undefined,
          sessionsPerWeek: bodyProfile?.sessionsPerWeek ?? undefined,
        });
        applySession(session);
        applyPendingOnboardingProfileAfterAuth(true);
        clearPendingInviteCode();
        trackAuthSuccess({ method: "email", isNewUser: true });
      } catch (e) {
        setLastError(normalizeError(e));
        throw e;
      }
    },
    [applySession, clearError],
  );

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    clearError();
    try {
      const session = await loginWithEmail({ email, password });
      applySession(session);
      applyPendingOnboardingProfileAfterAuth(false);
      trackAuthSuccess({ method: "email", isNewUser: false });
    } catch (e) {
      setLastError(normalizeError(e));
      throw e;
    }
  }, [applySession, clearError]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!readStoredSession()?.refreshToken) return false;
    try {
      const session = await refreshSession();
      applySession(session);
      return true;
    } catch (error) {
      // Évite une déconnexion forcée sur panne réseau/serveur temporaire.
      // 401/403: clearSession déjà fait via setAuthSessionListener / refreshAccessToken.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        if (stateRef.current.status === "authenticated") {
          clearSession();
        }
      }
      return false;
    }
  }, [applySession, clearSession]);

  const logout = useCallback(async () => {
    clearError();
    try {
      const refreshToken = stateRef.current.refreshToken;
      if (refreshToken) {
        await logoutSession({ refreshToken });
      }
    } catch {
      // si le backend est indisponible, on supprime quand même localement
    } finally {
      clearOnboardingDraftsAndSession();
      clearSession();
    }
  }, [clearError, clearSession]);

  useEffect(() => {
    setAuthSessionListener({
      onRefreshed: (session) => {
        // Storage déjà à jour; aligne le state React (évite tokens stale / zombie).
        const next = sessionToState(session);
        stateRef.current = next;
        setState(next);
        void syncAppsFlyerCustomerUserId(session.user.id);
      },
      onCleared: () => {
        if (stateRef.current.status === "authenticated") {
          clearSession();
        }
      },
    });
    return () => setAuthSessionListener(null);
  }, [clearSession]);

  useEffect(() => {
    // refresh "best effort" au démarrage si on a une session (single-flight partagé).
    if (state.status !== "authenticated") return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      ...state,
      register,
      login,
      logout,
      refresh,
      acceptSession: applySession,
      lastError,
      clearError,
      setError,
    };
  }, [state, register, login, logout, refresh, lastError, clearError, setError, applySession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  }
  return ctx;
}
