import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial check
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("[Auth] Initial getSession error:", error.message);
      } else if (data.session) {
        console.log("[Auth] Session exists:", !!data.session);
      }
      setSession(data.session);
      setLoading(false);
    });

    // 2. State change subscription
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const clearSession = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("clearSession error:", e);
    }
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith("sb-") ||
        key.includes("supabase") ||
        key.includes("auth-token")
      ) {
        localStorage.removeItem(key);
      }
    });
    setSession(null);
  };

  const signOut = async () => {
    await clearSession();
    window.location.replace("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="size-10 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">
            Loading StudyMate AI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading, signOut, clearSession }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
