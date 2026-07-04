import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut } from "lucide-react";
import COURSES_DATA from "@/data/courses.json";

interface CourseInfo {
  semesters: number;
  branches: string[];
}

const COURSES = COURSES_DATA as Record<string, CourseInfo>;
const COURSE_NAMES = Object.keys(COURSES).sort();

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Settings — StudyMate AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const courseNames = useMemo(() => {
    const names = [...COURSE_NAMES];
    if (form.degree && !names.includes(form.degree)) {
      names.push(form.degree);
    }
    return names.sort();
  }, [form.degree]);

  const departmentNames = useMemo(() => {
    if (!form.degree || !COURSES[form.degree]) {
      return form.department ? [form.department] : [];
    }
    const branches = [...COURSES[form.degree].branches];
    if (form.department && !branches.includes(form.department)) {
      branches.push(form.department);
    }
    return branches.sort();
  }, [form.degree, form.department]);

  const maxSemesters = useMemo(() => {
    if (!form.degree || !COURSES[form.degree]) return 8;
    return COURSES[form.degree].semesters;
  }, [form.degree]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      college_name: form.college_name,
      degree: form.degree,
      department: form.department,
      semester: form.semester ? Number(form.semester) : null,
      preferred_language: form.preferred_language,
      learning_goal: form.learning_goal,
    }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["profile", user?.id] });
  };

  return (
    <div className="flex h-dvh bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Personalize your StudyMate experience.</p>
          </div>

          <Section title="Profile">
            <Field label="Full name"><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Email"><Input value={user?.email ?? ""} disabled /></Field>
          </Section>

          <Section title="Academic">
            <Field label="College"><Input value={form.college_name ?? ""} onChange={(e) => setForm({ ...form, college_name: e.target.value })} /></Field>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Degree">
                <Select 
                  value={form.degree ?? ""} 
                  onValueChange={(val) => {
                    const maxSem = COURSES[val]?.semesters ?? 8;
                    const nextSem = form.semester && Number(form.semester) > maxSem ? 1 : form.semester;
                    setForm({ ...form, degree: val, department: "", semester: nextSem });
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {courseNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Department">
                <Select 
                  value={form.department ?? ""} 
                  onValueChange={(val) => setForm({ ...form, department: val })}
                  disabled={!form.degree}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder={form.degree ? "Select Branch" : "Select Course first"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {departmentNames.map((branch) => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Semester">
                <Select 
                  value={form.semester ? String(form.semester) : "1"} 
                  onValueChange={(val) => setForm({ ...form, semester: Number(val) })}
                  disabled={!form.degree}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {Array.from({ length: maxSemesters }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>Sem {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Preferences">
            <Field label="Preferred language">
              <Select value={form.preferred_language ?? "English"} onValueChange={(v) => setForm({ ...form, preferred_language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["English", "Tamil", "Hindi", "Hinglish", "Thanglish"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="AI response style">
              <Select value={form.learning_goal ?? "Exam preparation"} onValueChange={(v) => setForm({ ...form, learning_goal: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Simple explanation","Detailed explanation","Exam answer format","Short notes","Exam preparation"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Appearance">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <div className="text-sm font-medium">Theme & accent</div>
                <div className="text-xs text-muted-foreground">Choose light, dark, system, and an accent color.</div>
              </div>
              <ThemeToggle />
            </div>
          </Section>

          <div className="flex justify-between pt-4 border-t border-border">
            <Button variant="ghost" onClick={signOut} className="text-destructive"><LogOut className="size-4 mr-2" />Sign out</Button>
            <Button onClick={save} className="bg-brand text-brand-foreground hover:opacity-90 rounded-xl">Save changes</Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-3 p-5 rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
