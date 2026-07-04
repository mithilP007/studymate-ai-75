import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, GraduationCap, Loader2, PlusCircle, ArrowRight, Search, Sparkles } from "lucide-react";
import STATE_DISTRICTS from "@/data/state-districts.json";
import COURSES_DATA from "@/data/courses.json";

interface CourseInfo {
  semesters: number;
  branches: string[];
}

const COURSES = COURSES_DATA as Record<string, CourseInfo>;
const COURSE_NAMES = Object.keys(COURSES).sort();

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Set up your account — StudyMate AI" }] }),
  component: Onboarding,
});

/** Sorted list of all Indian states from the CSV */
const ALL_STATES = Object.keys(STATE_DISTRICTS).sort() as string[];

/** Institution keyword filters — searches in college name */
const INSTITUTION_TYPES = [
  { label: "All Types",        keyword: "" },
  { label: "Engineering",      keyword: "Engineering" },
  { label: "Arts & Science",   keyword: "Arts" },
  { label: "Medical",          keyword: "Medical" },
  { label: "Polytechnic",      keyword: "Polytechnic" },
  { label: "University",       keyword: "University" },
  { label: "Nursing",          keyword: "Nursing" },
  { label: "Law",              keyword: "Law" },
  { label: "Management",       keyword: "Management" },
  { label: "Pharmacy",         keyword: "Pharmacy" },
  { label: "Education",        keyword: "Education" },
];

const LANGUAGES = ["English", "Tamil", "Hindi", "Hinglish", "Thanglish"];
const GOALS = ["Exam preparation", "Daily study", "Coding help", "Project help", "Interview prep", "Research help"];

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2 — college search filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeKeyword, setTypeKeyword] = useState("");        // keyword filter (college name)
  const [stateFilter, setStateFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<{ id?: string; name: string } | null>(null);

  // Manual entry
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualCollege, setManualCollege] = useState({
    name: "",
    state: "",
    district: "",
    type: "",
  });
  const [manualDistrictList, setManualDistrictList] = useState<string[]>([]);

  // Step 3 — profile
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "");
  const [degree, setDegree] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState<string>("1");
  const [language, setLanguage] = useState("English");
  const [goal, setGoal] = useState("Exam preparation");

  const maxSemesters = useMemo(() => {
    if (!degree || !COURSES[degree]) return 8;
    return COURSES[degree].semesters;
  }, [degree]);

  // When degree changes, reset department and ensure semester is within bounds
  useEffect(() => {
    if (degree) {
      setDepartment("");
      const maxSem = COURSES[degree]?.semesters ?? 8;
      if (parseInt(semester, 10) > maxSem) {
        setSemester("1");
      }
    }
  }, [degree]);

  // Debounce search by 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Districts filtered to selected state (main search)
  const districtOptions = useMemo<string[]>(() => {
    if (!stateFilter) return [];
    const map = STATE_DISTRICTS as Record<string, string[]>;
    return (map[stateFilter] ?? []).sort();
  }, [stateFilter]);

  // Districts filtered to manual-entry selected state
  useEffect(() => {
    if (!manualCollege.state) { setManualDistrictList([]); return; }
    const map = STATE_DISTRICTS as Record<string, string[]>;
    setManualDistrictList((map[manualCollege.state] ?? []).sort());
    setManualCollege((p) => ({ ...p, district: "" }));
  }, [manualCollege.state]);

  // --- College query (Supabase) ---
  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["colleges", debouncedSearch, typeKeyword, stateFilter, districtFilter],
    queryFn: async () => {
      let q = supabase
        .from("colleges")
        .select("id,name,state,city,district,institution_type,verified,source");

      // Split both user search and institution type keyword into individual words
      const words = debouncedSearch.split(/\s+/).filter(Boolean);
      if (typeKeyword) {
        words.push(typeKeyword);
      }
      const uniqueWords = Array.from(new Set(words.map((w) => w.toLowerCase())));

      // Apply independent ilike filters for each unique search term
      uniqueWords.forEach((word) => {
        q = q.ilike("name", `%${word}%`);
      });

      if (stateFilter)    q = q.eq("state",    stateFilter);
      if (districtFilter) q = q.eq("district", districtFilter);

      const { data, error } = await q.order("name").limit(40);
      if (error) throw error;
      return data;
    },
  });

  // Total college count
  const { data: totalCollegesCount = 0 } = useQuery({
    queryKey: ["colleges-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("colleges")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Popular colleges for empty-state
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

  // Redirect if already onboarded
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
      let collegeName = "";

      if (isManualEntry) {
        collegeName = manualCollege.name.trim();
        const firstLetter = collegeName.charAt(0).toUpperCase();

        const { data: newCollege, error: insertErr } = await supabase
          .from("colleges")
          .insert({
            name: collegeName,
            normalized_name: collegeName.toLowerCase(),
            state: manualCollege.state || null,
            district: manualCollege.district || null,
            city: manualCollege.district || null,          // use district as city fallback
            institution_type: manualCollege.type || null,
            verified: false,
            source: "User",
            first_letter: firstLetter,
          })
          .select("id")
          .maybeSingle();

        if (insertErr) {
          console.warn("Manual college insert failed:", insertErr.message);
        } else if (newCollege) {
          collegeId = newCollege.id;
          // Invalidate college list so the new entry appears in future searches
          qc.invalidateQueries({ queryKey: ["colleges"] });
          qc.invalidateQueries({ queryKey: ["colleges-count"] });
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
          manualCollege.district.trim().length > 1 &&
          !!manualCollege.type
        : !!selectedCollege)) ||
    (step === 3 && fullName.trim().length > 1 && !!degree && !!department);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border h-16 flex items-center justify-between px-6 bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <Link 
          to="/app" 
          className="cursor-pointer group flex items-center gap-2 transition-all duration-200 active:scale-95 hover:scale-[1.02] hover:drop-shadow-[0_0_8px_color-mix(in_oklab,var(--brand)_40%,transparent)]"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              Account: <strong className="text-foreground">{user.email}</strong>
            </span>
          )}
          <span className="hidden sm:block text-xs text-muted-foreground">Step {step} of 3</span>
          <ThemeToggle />
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Signed out successfully");
                nav({ to: "/auth" });
              }}
            >
              Sign Out
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12 animate-fade-up">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-brand" : "bg-muted"}`} />
          ))}
        </div>

        {/* ─── Step 1: Welcome ─── */}
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

        {/* ─── Step 2: College Selection ─── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Select your college</h1>
              <p className="mt-1 text-muted-foreground text-sm">Choose your institution to get a syllabus-aware AI experience.</p>
            </div>

            {totalCollegesCount < 1000 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs leading-relaxed space-y-1">
                <span className="font-bold block">⚠️ Development Sample Data Only</span>
                <p>Full India college CSV has not been imported yet.</p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>College directory: <strong className="text-foreground">{totalCollegesCount.toLocaleString()}</strong> institutions</span>
              {totalCollegesCount < 1000 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                  Sample List
                </span>
              )}
            </div>

            {!isManualEntry ? (
              <div className="space-y-4">
                {/* Search bar */}
                <div className="relative">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by college name..."
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>

                {/* Filter row: State / District / Institution Type (keyword) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* State */}
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
                    <SelectContent className="max-h-64">
                      <SelectItem value="all">All States</SelectItem>
                      {ALL_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* District — populated from CSV mapping */}
                  <Select
                    value={districtFilter || "all"}
                    onValueChange={(v) => {
                      setDistrictFilter(v === "all" ? "" : v);
                      setSelectedCollege(null);
                    }}
                    disabled={!stateFilter}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder={stateFilter ? "District" : "Select State first"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="all">All Districts</SelectItem>
                      {districtOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Institution type — keyword search on college name */}
                  <Select
                    value={typeKeyword || "all"}
                    onValueChange={(v) => {
                      setTypeKeyword(v === "all" ? "" : v);
                      setSelectedCollege(null);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Institution Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTITUTION_TYPES.map((t) => (
                        <SelectItem key={t.label} value={t.keyword || "all"}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* College list */}
                <div className="rounded-xl border border-border bg-surface max-h-80 overflow-y-auto divide-y divide-border">
                  {isLoading && (
                    <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin text-brand" /> Loading colleges...
                    </div>
                  )}

                  {!isLoading && colleges.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No colleges found. Try different filters or add yours manually below.
                    </div>
                  )}

                  {!isLoading && colleges.map((c) => {
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
                            {c.district || c.city}{c.state ? `, ${c.state}` : ""}
                          </div>
                        </div>
                        {active && <Check className="size-4 text-brand shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Popular colleges quick-picks */}
                {!search && !stateFilter && popularColleges.length > 0 && (
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
                              {c.district || c.city}{c.state ? `, ${c.state}` : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Manual Entry Form ── */
              <div className="rounded-xl border border-dashed border-brand/40 bg-brand-soft/10 p-5 space-y-4 animate-fade-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="size-4 text-brand" />
                    <h3 className="text-sm font-bold text-foreground">Add College Manually</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualEntry(false);
                      setManualCollege({ name: "", state: "", district: "", type: "" });
                    }}
                    className="text-xs text-brand hover:underline font-semibold"
                  >
                    Back to Search
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Your college will be added to the directory so other students can find it too.
                </p>

                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="manual-name" className="text-xs font-semibold">College / Institution Name *</Label>
                    <Input
                      id="manual-name"
                      placeholder="e.g. SRM Institute of Science and Technology"
                      value={manualCollege.name}
                      onChange={(e) => setManualCollege((p) => ({ ...p, name: e.target.value }))}
                      className="h-10 rounded-lg text-sm bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* State dropdown */}
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold">State *</Label>
                      <Select
                        value={manualCollege.state || ""}
                        onValueChange={(v) => setManualCollege((p) => ({ ...p, state: v, district: "" }))}
                      >
                        <SelectTrigger className="h-10 rounded-lg text-sm bg-background">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {ALL_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* District dropdown — filtered by selected state */}
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold">District *</Label>
                      <Select
                        value={manualCollege.district || ""}
                        onValueChange={(v) => setManualCollege((p) => ({ ...p, district: v }))}
                        disabled={!manualCollege.state}
                      >
                        <SelectTrigger className="h-10 rounded-lg text-sm bg-background">
                          <SelectValue placeholder={manualCollege.state ? "Select District" : "Select State first"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {manualDistrictList.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold">Institution Type *</Label>
                    <Select
                      value={manualCollege.type}
                      onValueChange={(v) => setManualCollege((p) => ({ ...p, type: v }))}
                    >
                      <SelectTrigger className="h-10 rounded-lg text-sm bg-background">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {INSTITUTION_TYPES.filter((t) => t.keyword !== "").map((t) => (
                          <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

             {/* Bottom bar */}
            <div className="flex flex-col gap-4 pt-4 border-t border-border">
              {!isManualEntry ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsManualEntry(true);
                    setSelectedCollege(null);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-brand/50 bg-brand-soft/10 hover:bg-brand-soft/20 text-brand transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.99] duration-200"
                >
                  <div className="flex items-center gap-3">
                    <PlusCircle className="size-5 shrink-0 text-brand" />
                    <div className="text-left">
                      <span className="text-xs font-bold block text-foreground">My college is not listed</span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">Click here to manually type your college name, state, and district</span>
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-brand" />
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
          </div>
        )}

        {/* ─── Step 3: Profile Details ─── */}
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
                  <Select value={degree} onValueChange={setDegree}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {COURSE_NAMES.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Branch / Department</Label>
                  <Select 
                    value={department} 
                    onValueChange={setDepartment}
                    disabled={!degree}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder={degree ? "Select Branch" : "Select Course first"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {degree && COURSES[degree]?.branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                  <Label>Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {Array.from({ length: maxSemesters }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>Sem {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Goal</Label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
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
