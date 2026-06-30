import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Flame, Clock, MessageSquare, ListChecks, FileText, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({
  ssr: false,
  head: () => ({ meta: [{ title: "Progress — StudyMate AI" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useAuth();

  const { data: rows = [] } = useQuery({
    queryKey: ["progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("study_progress").select("*").order("date", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const today = rows.find((r) => r.date === new Date().toISOString().slice(0, 10));
  const weekly = rows.slice(0, 7);
  const activeDays = weekly.length;
  const totalChats = rows.reduce((s, r) => s + (r.chats_count ?? 0), 0);
  const totalQuizzes = rows.reduce((s, r) => s + (r.quizzes_completed ?? 0), 0);
  const totalNotes = rows.reduce((s, r) => s + (r.notes_generated ?? 0), 0);
  const streak = computeStreak(rows.map((r) => r.date));

  return (
    <div className="flex h-dvh bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Study Progress</h1>
            <p className="text-sm text-muted-foreground mt-1">Keep your streak going — small daily wins compound.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <Stat icon={Clock} label="Study today" value={`${today?.study_minutes ?? 0} min`} />
            <Stat icon={Flame} label="Current streak" value={`${streak} days`} highlight />
            <Stat icon={MessageSquare} label="Total chats" value={totalChats} />
            <Stat icon={TrendingUp} label="Active days (7d)" value={`${activeDays}/7`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="p-6 rounded-2xl border border-border bg-surface">
              <h3 className="font-semibold mb-4">Last 7 days</h3>
              <div className="flex items-end gap-2 h-32">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - (6 - i));
                  const iso = d.toISOString().slice(0, 10);
                  const row = rows.find((r) => r.date === iso);
                  const mins = row?.study_minutes ?? 0;
                  const h = Math.min(100, (mins / 60) * 100);
                  return (
                    <div key={iso} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full rounded-md bg-brand/70 hover:bg-brand transition-colors" style={{ height: `${Math.max(h, 4)}%` }} />
                      <div className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en", { weekday: "short" })[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Subjects</h3>
                <span className="text-xs text-muted-foreground">{subjects.length} tracked</span>
              </div>
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add subjects from the planner to see progress here.</p>
              ) : (
                <div className="space-y-3">
                  {subjects.slice(0, 5).map((s) => (
                    <div key={s.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">{s.progress_percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: `${s.progress_percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Stat icon={FileText} label="Notes generated" value={totalNotes} />
            <Stat icon={ListChecks} label="Quizzes completed" value={totalQuizzes} />
            <Link to="/app" className="p-5 rounded-2xl border border-brand/30 bg-brand-soft text-brand hover:bg-brand/15 transition-colors flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">Continue learning</div>
                <div className="text-sm font-medium mt-1">Open chat →</div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, highlight }: any) {
  return (
    <div className={`p-5 rounded-2xl border ${highlight ? "border-brand/30 bg-brand-soft" : "border-border bg-surface"}`}>
      <Icon className={`size-4 ${highlight ? "text-brand" : "text-muted-foreground"}`} />
      <div className="mt-3 text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function computeStreak(dates: string[]) {
  const set = new Set(dates);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (set.has(d.toISOString().slice(0, 10))) streak++;
    else if (i > 0) break;
  }
  return streak;
}
