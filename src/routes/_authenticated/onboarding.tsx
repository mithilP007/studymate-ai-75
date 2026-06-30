import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, GraduationCap, Loader2, Search, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Set up your account — StudyMate AI" }] }),
  component: Onboarding,
});

const INSTITUTION_TYPES = ["Engineering", "Arts & Science", "Medical", "Polytechnic", "University", "Other"];
const LANGUAGES = ["English", "Tamil", "Hindi", "Hinglish", "Other"];
const GOALS = ["Exam preparation", "Daily study", "Coding help", "Project help", "Interview prep", "Research help"];

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [selectedCollege, setSelectedCollege] = useState<{ id?: string; name: string } | null>(null);

  // Step 3
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "");
  const [degree, setDegree] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState<string>("1");
  const [language, setLanguage] = useState("English");
  const [goal, setGoal] = useState("Exam preparation");

  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["colleges", search, typeFilter, stateFilter],
    queryFn: async () => {
      let q = supabase.from("colleges").select("id,name,state,city,institution_type").limit(40);
      if (search) q = q.ilike("name", `%${search}%`);
      if (typeFilter) q = q.eq("institution_type", typeFilter);
      if (stateFilter) q = q.eq("state", stateFilter);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: states = [] } = useQuery({
    queryKey: ["college-states"],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("state").not("state", "is", null);
      return Array.from(new Set((data ?? []).map((d) => d.state).filter(Boolean))).sort() as string[];
    },
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.onboarding_completed) nav({ to: "/app" }); });
  }, [user, nav]);

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      college_id: selectedCollege?.id ?? null,
      college_name: selectedCollege?.name ?? null,
      degree,
      department,
      semester: parseInt(semester, 10),
      preferred_language: language,
      learning_goal: goal,
      onboarding_completed: true,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error("Could not save profile", { description: error.message });
    toast.success("Welcome to StudyMate AI!");
    nav({ to: "/app" });
  };

  const canNext = (step === 2 && !!selectedCollege) || (step === 3 && fullName.trim().length > 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border h-16 flex items-center justify-between px-6">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs text-muted-foreground">Step {step} of 3</span>
          <ThemeToggle />
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-6 py-12 animate-fade-up">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-brand" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="size-16 mx-auto rounded-2xl bg-brand-soft text-brand grid place-items-center">
              <Sparkles className="size-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Welcome to StudyMate AI</h1>
              <p className="mt-2 text-muted-foreground">Let's set up your personalized study space.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-surface border border-border">
              Signed in as <span className="font-medium">{user?.email}</span>
            </div>
            <div>
              <Button size="lg" onClick={() => setStep(2)} className="bg-brand text-brand-foreground hover:opacity-90 rounded-xl h-12 px-8">
                Continue Setup
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Select your college</h1>
              <p className="mt-1 text-muted-foreground text-sm">Choose your institution to get a syllabus-aware AI experience.</p>
            </div>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by college name..."
                className="pl-9 h-11 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Institution type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {INSTITUTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={stateFilter || "all"} onValueChange={(v) => setStateFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">All states</SelectItem>
                  {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border bg-surface max-h-80 overflow-y-auto divide-y divide-border">
              {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading colleges...</div>}
              {!isLoading && colleges.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No colleges match. Try different filters.</div>
              )}
              {colleges.map((c) => {
                const active = selectedCollege?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCollege({ id: c.id, name: c.name })}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-accent transition-colors ${active ? "bg-brand-soft" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.institution_type} • {c.city}, {c.state}
                      </div>
                    </div>
                    {active && <Check className="size-4 text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setSelectedCollege({ name: "My college is not listed" })}
              className={`text-xs underline text-muted-foreground hover:text-foreground ${selectedCollege?.name === "My college is not listed" ? "text-brand" : ""}`}
            >
              My college is not listed
            </button>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">Back</Button>
              <Button disabled={!canNext} onClick={() => setStep(3)} className="flex-1 bg-brand text-brand-foreground hover:opacity-90 rounded-xl h-11">Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Tell us about your studies</h1>
              <p className="mt-1 text-muted-foreground text-sm">We'll tailor every answer to your branch and semester.</p>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Arjun Reddy" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label>Degree / Course</Label>
                  <Input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="B.E. / B.Tech / B.Sc" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Department</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="CSE / ECE / Mech" />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                  <Label>Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 10 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>Sem {i + 1}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Goal</Label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-xs text-muted-foreground px-3 py-2 rounded-lg bg-muted">
                <GraduationCap className="size-3.5 inline mr-1.5 -mt-0.5 text-brand" />
                College: <span className="font-medium text-foreground">{selectedCollege?.name}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">Back</Button>
              <Button disabled={!canNext || saving} onClick={finish} className="flex-1 bg-brand text-brand-foreground hover:opacity-90 rounded-xl h-11">
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Enter Learning Space
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
