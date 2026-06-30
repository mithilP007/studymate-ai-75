import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/planner")({
  ssr: false,
  head: () => ({ meta: [{ title: "Study Planner — StudyMate AI" }] }),
  component: Planner,
});

function Planner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["planner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("planner_tasks").select("*").order("due_date", { ascending: true });
      return data ?? [];
    },
  });

  const add = async () => {
    if (!topic.trim() || !user) return;
    const { error } = await supabase.from("planner_tasks").insert({
      user_id: user.id, subject: subject || null, topic, due_date: date || null,
    });
    if (error) return toast.error(error.message);
    setSubject(""); setTopic(""); setDate("");
    qc.invalidateQueries({ queryKey: ["planner", user.id] });
  };

  const toggle = async (id: string, completed: boolean) => {
    await supabase.from("planner_tasks").update({ completed }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["planner", user?.id] });
  };

  const remove = async (id: string) => {
    await supabase.from("planner_tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["planner", user?.id] });
  };

  return (
    <div className="flex h-dvh bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Study Planner</h1>
            <p className="text-sm text-muted-foreground mt-1">Track topics, deadlines, and exam prep in one checklist.</p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface mb-6">
            <div className="grid sm:grid-cols-3 gap-2 mb-2">
              <Input placeholder="Subject (e.g. DSA)" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Input placeholder="Topic or task" value={topic} onChange={(e) => setTopic(e.target.value)} />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button onClick={add} disabled={!topic.trim()} className="bg-brand text-brand-foreground hover:opacity-90 rounded-xl">
              <Plus className="size-4 mr-1" /> Add task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl">
              <CalendarDays className="size-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">Plan your week</h3>
              <p className="text-sm text-muted-foreground">Add exam dates, revision topics, and assignments above.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
              {tasks.map((t) => (
                <div key={t.id} className="p-4 flex items-center gap-3">
                  <Checkbox checked={t.completed} onCheckedChange={(c) => toggle(t.id, !!c)} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.topic}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.subject ? `${t.subject} • ` : ""}{t.due_date ?? "No date"}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)} className="text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
