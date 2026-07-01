import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("Session fetch error:", sessionError);
          navigate({ to: "/auth", replace: true });
          return;
        }

        const user = session.user;

        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile fetch error:", profileError.message);
          navigate({ to: "/auth", replace: true });
          return;
        }

        if (!existingProfile) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
          const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";

          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            avatar_url: avatarUrl,
            onboarding_completed: false,
          });

          if (insertError) {
            console.error("Profile create error:", insertError.message);
            navigate({ to: "/auth", replace: true });
            return;
          }

          navigate({ to: "/onboarding", replace: true });
          return;
        }

        if (existingProfile.onboarding_completed) {
          navigate({ to: "/app", replace: true }); // '/app' serves as the dashboard
        } else {
          navigate({ to: "/onboarding", replace: true });
        }
      } catch (err) {
        console.error("Auth callback exception:", err);
        navigate({ to: "/auth", replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 border border-border bg-surface text-center space-y-6 shadow-2xl animate-fade-up">
        <div className="flex justify-center">
          <div className="size-16 rounded-full bg-brand-soft text-brand grid place-items-center relative">
            <span className="relative flex h-8 w-8">
              <Loader2 className="size-8 animate-spin text-brand" />
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Signing you in securely…</h1>
          <p className="text-sm text-muted-foreground">
            Please wait while we prepare your learning space.
          </p>
        </div>
      </Card>
    </div>
  );
}
