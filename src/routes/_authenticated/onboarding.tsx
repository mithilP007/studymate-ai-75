import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

const INSTITUTION_TYPES = [
  "Engineering",
  "Arts & Science",
  "Medical",
  "Polytechnic",
  "University",
  "Nursing",
  "Law",
  "Management",
  "Pharmacy",
  "Education",
  "Other",
];
const LANGUAGES = ["English", "Tamil", "Hindi", "Hinglish", "Other"];
const GOALS = ["Exam preparation", "Daily study", "Coding help", "Project help", "Interview prep", "Research help"];

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2 state variables
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [firstLetter, setFirstLetter] = useState<string>("All");
  const [selectedCollege, setSelectedCollege] = useState<{ id?: string; name: string } | null>(null);

  // Manual entry states
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualCollege, setManualCollege] = useState({
    name: "",
    state: "",
    city: "",
    type: "",
  });

  // Step 3 state variables
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "");
  const [degree, setDegree] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState<string>("1");
  const [language, setLanguage] = useState("English");
  const [goal, setGoal] = useState("Exam preparation");

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Main college query hook
  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["colleges", debouncedSearch, typeFilter, stateFilter, districtFilter, firstLetter],
    queryFn: async () => {
      let q = supabase
        .from("colleges")
        .select("id,name,state,city,district,institution_type,verified,source");

      if (debouncedSearch) {
        q = q.ilike("name", `%${debouncedSearch}%`);
      }

      if (firstLetter && firstLetter !== "All") {
        q = q.eq("first_letter", firstLetter);
      }

      if (stateFilter && stateFilter !== "all" && stateFilter !== "") {
        q = q.eq("state", stateFilter);
      }

      if (districtFilter && districtFilter !== "all" && districtFilter !== "") {
        q = q.eq("district", districtFilter);
      }

      if (typeFilter && typeFilter !== "all" && typeFilter !== "") {
        q = q.eq("institution_type", typeFilter);
      }

      const { data, error } = await q.order("name").limit(35);
      if (error) throw error;
      return data;
    },
  });

  // Query unique states list
  const { data: states = [] } = useQuery({
    queryKey: ["college-states"],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("state").not("state", "is", null);
      return Array.from(new Set((data ?? []).map((d) => d.state).filter(Boolean))).sort() as string[];
    },
  });

  // Query districts dynamic list
  const { data: districts = [] } = useQuery({
    queryKey: ["college-districts", stateFilter],
    queryFn: async () => {
      if (!stateFilter || stateFilter === "all") return [];
      const { data } = await supabase
        .from("colleges")
        .select("district")
        .eq("state", stateFilter)
        .not("district", "is", null);
      return Array.from(new Set((data ?? []).map((d) => d.district).filter(Boolean))).sort() as string[];
    },
    enabled: !!stateFilter && stateFilter !== "all",
  });

  // Query popular/recent colleges for empty-state recommendations
  const { data: popularColleges = [] } = useQuery({
    queryKey: ["popular-colleges"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("id,name,state,city,district,institution_type,verified,source")
        .eq("verified", true)
        .limit(4);
      return data ?? [];
    },
  });

  // Query total number of colleges loaded in public.colleges
  const { data: totalCollegesCount = 0, refetch: refetchCount } = useQuery({
    queryKey: ["colleges-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("colleges")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
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
    try {
      let collegeId: string | null = null;
      let collegeName: string = "";

      if (isManualEntry) {
        collegeName = manualCollege.name.trim();

        // Safe insertion of unverified custom college
        const firstLetterChar = collegeName.charAt(0).toUpperCase();
        const { data: newCollege, error: insertCollegeError } = await supabase
          .from("colleges")
          .insert({
            name: collegeName,
            normalized_name: collegeName.toLowerCase(),
            state: manualCollege.state.trim() || null,
            city: manualCollege.city.trim() || null,
            institution_type: manualCollege.type || null,
            verified: false,
            source: "User",
            first_letter: firstLetterChar,
          })
          .select("id")
          .maybeSingle();

        if (insertCollegeError) {
          console.warn("Could not save manual college to registry:", insertCollegeError.message);
        } else if (newCollege) {
          collegeId = newCollege.id;
        }
      } else {
        collegeId = selectedCollege?.id ?? null;
        collegeName = selectedCollege?.name ?? "";
      }

      const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        college_id: collegeId,
        college_name: collegeName,
        degree,
        department,
        semester: parseInt(semester, 10),
        preferred_language: language,
        learning_goal: goal,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      if (error) {
        toast.error("Could not save profile", { description: error.message });
      } else {
        toast.success("Welcome to StudyMate AI!");
        nav({ to: "/app" });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred during onboarding.");
    } finally {
      setSaving(false);
    }
  };

  const canNext =
    (step === 2 &&
      (isManualEntry
        ? manualCollege.name.trim().length > 2 &&
          manualCollege.state.trim().length > 1 &&
          manualCollege.city.trim().length > 1 &&
          !!manualCollege.type
        : !!selectedCollege)) ||
    (step === 3 && fullName.trim().length > 1);

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
        {/* Progress bar */}
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

            {/* Development Sample Alert */}
            {totalCollegesCount < 1000 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs leading-relaxed space-y-1">
                <span className="font-bold block">⚠️ Development Sample Data Only</span>
                <p>Full India college CSV has not been imported yet. You can configure the directory by following the <a href="file:///d:/studymate/studymate-ai-75/docs/FULL_COLLEGE_IMPORT_GUIDE.md" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-85 font-semibold">Import Guide</a>.</p>
              </div>
            )}

            {/* Directory count status */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>College directory: <strong className="text-foreground">{totalCollegesCount}</strong> institutions loaded</span>
              {totalCollegesCount < 1000 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                  Sample List
                </span>
              )}
            </div>

            {!isManualEntry ? (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by college name..."
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>

                {/* A-Z Alphabet Filter */}
                <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2 scroll-smooth">
                  {["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((letter) => {
                    const active = firstLetter === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => {
                          setFirstLetter(letter);
                          setSelectedCollege(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 transition-colors ${
                          active
                            ? "bg-brand text-brand-foreground border-brand"
                            : "bg-surface border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>

                {/* Advanced Dropdown Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    value={stateFilter || "all"}
                    onValueChange={(v) => {
                      setStateFilter(v === "all" ? "" : v);
                      setDistrictFilter("");
                      setSelectedCollege(null);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All States</SelectItem>
                      {states.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={districtFilter || "all"}
                    onValueChange={(v) => {
                      setDistrictFilter(v === "all" ? "" : v);
                      setSelectedCollege(null);
                    }}
                    disabled={!stateFilter || stateFilter === ""}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder={stateFilter ? "District" : "State Required"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All Districts</SelectItem>
                      {districts.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={typeFilter || "all"}
                    onValueChange={(v) => {
                      setTypeFilter(v === "all" ? "" : v);
                      setSelectedCollege(null);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {INSTITUTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Colleges list */}
                <div className="rounded-xl border border-border bg-surface max-h-80 overflow-y-auto divide-y divide-border">
                  {isLoading && (
                    <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin text-brand" /> Loading colleges...
                    </div>
                  )}

                  {!isLoading && colleges.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      College not found. You can add it manually or import the full official India college dataset.
                    </div>
                  )}

                  {!isLoading &&
                    colleges.map((c) => {
                      const active = selectedCollege?.id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCollege({ id: c.id, name: c.name })}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-accent transition-colors ${
                            active ? "bg-brand-soft" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold flex items-center gap-2 truncate">
                              <span>{c.name}</span>
                              {c.verified ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-600 border border-green-500/20">
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                  {c.source || "External"}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {c.institution_type} • {c.district || c.city}, {c.state}
                            </div>
                          </div>
                          {active && <Check className="size-4 text-brand shrink-0" />}
                        </button>
                      );
                    })}
                </div>

                {/* Directory sample-only notice warning */}
                {totalCollegesCount < 1000 && (
                  <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 text-center">
                    Only sample college data is loaded. Import the full AISHE/UGC/AICTE dataset to search all Indian colleges.
                  </p>
                )}

                {/* Popular colleges quick selection */}
                {!search && (!stateFilter || stateFilter === "") && firstLetter === "All" && popularColleges.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">Popular / Recent Institutions</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {popularColleges.map((c) => {
                        const active = selectedCollege?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCollege({ id: c.id, name: c.name })}
                            className={`p-3 rounded-lg border text-left text-xs transition-colors hover:bg-accent/50 ${
                              active ? "border-brand bg-brand-soft" : "border-border bg-surface"
                            }`}
                          >
                            <span className="font-semibold block truncate">{c.name}</span>
                            <span className="text-muted-foreground block truncate">
                              {c.district || c.city}, {c.state}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Manual Entry Form */
              <div className="rounded-xl border border-dashed border-border p-5 bg-muted/20 space-y-4 animate-fade-up">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Manually Enter College Details</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualEntry(false);
                      setManualCollege({ name: "", state: "", city: "", type: "" });
                    }}
                    className="text-xs text-brand hover:underline font-semibold"
                  >
                    Back to Search
                  </button>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="manual-name" className="text-xs">College / Institution Name</Label>
                    <Input
                      id="manual-name"
                      placeholder="e.g. SRM Institute of Science and Technology"
                      value={manualCollege.name}
                      onChange={(e) => setManualCollege((prev) => ({ ...prev, name: e.target.value }))}
                      className="h-10 rounded-lg text-sm bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="manual-state" className="text-xs">State</Label>
                      <Input
                        id="manual-state"
                        placeholder="e.g. Tamil Nadu"
                        value={manualCollege.state}
                        onChange={(e) => setManualCollege((prev) => ({ ...prev, state: e.target.value }))}
                        className="h-10 rounded-lg text-sm bg-background"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="manual-city" className="text-xs">City / Town</Label>
                      <Input
                        id="manual-city"
                        placeholder="e.g. Chennai"
                        value={manualCollege.city}
                        onChange={(e) => setManualCollege((prev) => ({ ...prev, city: e.target.value }))}
                        className="h-10 rounded-lg text-sm bg-background"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="manual-type" className="text-xs">Institution Type</Label>
                      <Select
                        value={manualCollege.type}
                        onValueChange={(v) => setManualCollege((prev) => ({ ...prev, type: v }))}
                      >
                        <SelectTrigger className="h-10 rounded-lg text-sm bg-background">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {INSTITUTION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              {!isManualEntry ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsManualEntry(true);
                    setSelectedCollege(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold underline"
                >
                  My college is not listed
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={!canNext}
                  onClick={() => setStep(3)}
                  className="flex-1 sm:flex-none bg-brand text-brand-foreground hover:opacity-90 rounded-xl h-11 px-6 font-semibold"
                >
                  Continue
                </Button>
              </div>
            </div>

            {/* Developer utility card */}
            <details className="text-xs border border-border rounded-xl bg-muted/20 p-3 select-none">
              <summary className="font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
                🛠️ Developer Import Utility
              </summary>
              <div className="mt-2 space-y-2 text-muted-foreground leading-relaxed select-text">
                <p>To populate the directory with the complete dataset of 45,000+ Indian higher education institutions:</p>
                <div className="bg-background p-2.5 rounded border border-border font-mono text-[10px] space-y-1">
                  <div>1. Place official CSV at: <span className="text-foreground">data/india_colleges.csv</span></div>
                  <div>2. Configure <span className="text-foreground font-bold">SUPABASE_SERVICE_ROLE_KEY</span> in .env</div>
                  <div>3. Run script command:</div>
                  <div className="text-brand font-bold mt-1">bun run scripts/import-colleges.ts</div>
                </div>
                <div className="flex justify-between items-center text-[10px] pt-1">
                  <span>Current directory: <strong>{totalCollegesCount} loaded</strong></span>
                  <span className={`px-2 py-0.5 rounded font-bold border ${totalCollegesCount < 1000 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"}`}>
                    {totalCollegesCount < 1000 ? "Import Status: Sample Only" : "Import Status: Complete"}
                  </span>
                </div>
              </div>
            </details>
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
              <div className="text-xs text-muted-foreground px-3 py-2 rounded-lg bg-muted flex items-center gap-2">
                <GraduationCap className="size-4 text-brand shrink-0" />
                <span className="truncate">
                  College: <span className="font-semibold text-foreground">{isManualEntry ? manualCollege.name : selectedCollege?.name}</span>
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="rounded-xl">Back</Button>
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
