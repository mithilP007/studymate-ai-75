import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        // Clear stale session tokens and redirect to auth
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("sb-") ||
            key.includes("supabase") ||
            key.includes("auth-token")
          ) {
            localStorage.removeItem(key);
          }
        });
        throw redirect({ to: "/auth" });
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("[Auth] Profile verification failed:", profileError.message);
        throw redirect({ to: "/auth" });
      }

      const onboardingCompleted = profile?.onboarding_completed ?? false;
      const isOnboardingPath = location.pathname === "/onboarding";

      if (onboardingCompleted && isOnboardingPath) {
        throw redirect({ to: "/app" }); // '/app' serves as the dashboard in this codebase
      }

      return { user: session.user, profile };
    } catch (e: any) {
      // If it is a TanStack redirect throw, let it pass through!
      if (e && typeof e === 'object' && 'to' in e) {
        throw e;
      }
      console.error("[Auth] Error in route protection:", e);
      // Clear localStorage on uncaught errors (self-heal)
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith("sb-") ||
          key.includes("supabase") ||
          key.includes("auth-token")
        ) {
          localStorage.removeItem(key);
        }
      });
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
