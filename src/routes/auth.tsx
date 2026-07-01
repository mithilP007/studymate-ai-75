import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — StudyMate AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) await routeAfterAuth(nav);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === "SIGNED_IN" && s) await routeAfterAuth(nav);
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error("Google sign-in failed", { description: error.message });
        setLoading(false);
      }
    } catch (e) {
      toast.error("Could not start sign-in");
      console.error(e);
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error("Sign in failed", { description: error.message });
      } else {
        toast.success("Successfully signed in!");
      }
    } catch (err) {
      toast.error("Could not sign in");
      console.error(err);
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEmail(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/auth",
        },
      });
      if (error) {
        toast.error("Sign up failed", { description: error.message });
      } else {
        if (data?.session) {
          toast.success("Successfully signed up!");
        } else {
          toast.success("Sign up successful!", {
            description: "Please check your inbox to confirm your email.",
          });
        }
      }
    } catch (err) {
      toast.error("Could not sign up");
      console.error(err);
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 h-16 border-b border-border">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex-1 grid place-items-center px-6 py-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-brand text-xs font-bold tracking-wider uppercase mb-4">
              Welcome
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {mode === "signin" ? "Sign in to StudyMate AI" : "Create your account"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {mode === "signin"
                ? "Continue with Google or email to access your study workspace."
                : "Create an account with Google or email to start learning."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-8 space-y-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading || loadingEmail}
              size="lg"
              variant="outline"
              className="w-full h-12 rounded-xl font-medium"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <GoogleIcon />}
              Continue with Google
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">or</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <form onSubmit={mode === "signin" ? handleEmailSignIn : handleEmailSignUp} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || loadingEmail}
                className="w-full h-11 rounded-xl bg-brand text-brand-foreground hover:opacity-90 font-medium"
              >
                {loadingEmail ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {mode === "signin" ? "Sign In" : "Sign Up"}
              </Button>
            </form>

            <div className="text-center text-sm pt-2">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-brand font-medium hover:underline focus:outline-none"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-brand font-medium hover:underline focus:outline-none"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <p className="text-[11px] text-center text-muted-foreground leading-relaxed pt-2">
              By continuing you agree to our Terms and acknowledge our Privacy Policy. Your study data is encrypted and private to you.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

async function routeAfterAuth(nav: ReturnType<typeof useNavigate>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.onboarding_completed) {
    nav({ to: "/onboarding" });
  } else {
    nav({ to: "/app" });
  }
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 mr-2" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

