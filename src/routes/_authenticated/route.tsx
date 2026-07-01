import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    const onboardingCompleted = profile?.onboarding_completed ?? false;
    const isOnboardingPath = location.pathname === "/onboarding";

    if (!onboardingCompleted && !isOnboardingPath) {
      throw redirect({ to: "/onboarding" });
    }

    if (onboardingCompleted && isOnboardingPath) {
      throw redirect({ to: "/app" });
    }

    return { user: data.user, profile };
  },
  component: () => <Outlet />,
});
