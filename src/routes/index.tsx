import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, GraduationCap, ListChecks, MessageSquare, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle, PersonalizeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyMate AI — Your AI Study Companion for College Learning" },
      { name: "description", content: "Ask doubts, summarize PDFs, generate quizzes, and master your semester with an AI study companion built for Indian college students." },
      { property: "og:title", content: "StudyMate AI — Your AI Study Companion" },
      { property: "og:description", content: "AI study companion built for Indian college students." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [activeSection, setActiveSection] = useState<string>("");

  // Smooth scroll implementation with easeInOutCubic deceleration and offset
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.scrollIntoView({ behavior: "auto" });
      return;
    }

    const headerOffset = 90;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    const startPosition = window.pageYOffset;
    const distance = offsetPosition - startPosition;
    const duration = 800; // 700ms - 900ms target
    let startTimestamp: number | null = null;

    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      window.scrollTo(0, startPosition + distance * easeInOutCubic(progress));

      if (elapsed < duration) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  };

  // IntersectionObserver to highlight currently active section
  useEffect(() => {
    const sections = ["features", "how", "faq"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        {
          rootMargin: "-30% 0px -55% 0px", // triggers when section is in active view area
        }
      );
      observer.observe(el);
      return { observer, el, id };
    });

    // Clear active section if at the very top of the page
    const handleScroll = () => {
      if (window.pageYOffset < 100) {
        setActiveSection("");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observers.forEach((item) => {
        if (item) item.observer.unobserve(item.el);
      });
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand/20">
      {/* Nav — solid background so scrolled content doesn't bleed through */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo with global navigation + premium hover scaling and glow */}
          <Link 
            to="/" 
            className="cursor-pointer group flex items-center gap-2 transition-all duration-200 active:scale-95 hover:scale-[1.03] hover:drop-shadow-[0_0_8px_color-mix(in_oklab,var(--brand)_40%,transparent)]"
            onClick={(e) => {
              if (window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <Logo />
          </Link>

          {/* Nav links with hover & active animations */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a 
              href="#features" 
              onClick={(e) => handleScrollTo(e, "features")}
              className={`relative py-2 transition-colors duration-200 cursor-pointer ${
                activeSection === "features" ? "text-foreground" : "hover:text-foreground"
              }`}
            >
              Features
              <span 
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-brand origin-center transition-transform duration-300 ease-out ${
                  activeSection === "features" ? "w-full scale-x-100" : "w-full scale-x-0 hover:scale-x-100"
                }`}
              />
            </a>
            <a 
              href="#how" 
              onClick={(e) => handleScrollTo(e, "how")}
              className={`relative py-2 transition-colors duration-200 cursor-pointer ${
                activeSection === "how" ? "text-foreground" : "hover:text-foreground"
              }`}
            >
              How It Works
              <span 
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-brand origin-center transition-transform duration-300 ease-out ${
                  activeSection === "how" ? "w-full scale-x-100" : "w-full scale-x-0 hover:scale-x-100"
                }`}
              />
            </a>
            <a 
              href="#faq" 
              onClick={(e) => handleScrollTo(e, "faq")}
              className={`relative py-2 transition-colors duration-200 cursor-pointer ${
                activeSection === "faq" ? "text-foreground" : "hover:text-foreground"
              }`}
            >
              FAQ
              <span 
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-brand origin-center transition-transform duration-300 ease-out ${
                  activeSection === "faq" ? "w-full scale-x-100" : "w-full scale-x-0 hover:scale-x-100"
                }`}
              />
            </a>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <PersonalizeToggle />
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full ml-1 font-medium transition-transform active:scale-95 duration-200">
                Log in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-full bg-brand text-brand-foreground hover:opacity-95 ml-1 font-semibold btn-premium group">
                Get Started 
                <ArrowRight className="size-3.5 ml-1 transition-transform duration-220 ease-out group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--brand-soft),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft border border-brand/20 text-brand text-xs font-bold tracking-wider uppercase mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
            </span>
            Built for Indian Universities
          </div>
          
          {/* Subtle gradient glow behind highlighted text */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance leading-[1.05] max-w-4xl mx-auto">
            Your Personal AI Study Mate for <span className="relative text-brand inline-block">
              College Learning
              <span className="absolute -inset-x-2 -inset-y-1 -z-10 bg-brand/10 blur-xl rounded-full opacity-70 animate-pulse duration-[4000ms]" />
            </span>
          </h1>
          
          <p className="mt-6 text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
            Ask doubts, generate quizzes, and master your semester — tailored to Anna University, VIT, IIT Madras, and 40,000+ Indian colleges.
          </p>

          {/* Staggered load animation on hero CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth" className="animate-cta-1">
              <Button size="lg" className="bg-brand text-brand-foreground hover:opacity-95 rounded-xl px-8 h-12 glow-brand btn-premium group font-bold">
                Start Learning Now 
                <ArrowRight className="size-4 ml-1 transition-transform duration-220 ease-out group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#features" onClick={(e) => handleScrollTo(e, "features")} className="animate-cta-2">
              <Button size="lg" variant="outline" className="rounded-xl px-8 h-12 btn-premium font-bold hover:bg-muted/30">
                See Features
              </Button>
            </a>
          </div>
        </div>

        {/* Chat preview */}
        <div className="max-w-5xl mx-auto px-6 pb-24 animate-fade-up [animation-delay:200ms]">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand/10 via-transparent to-brand/5 rounded-[2rem] -z-10 blur-xl" />
            <div className="bg-elevated rounded-2xl border border-border shadow-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 h-9 border-b border-border bg-background/50">
                <span className="size-2.5 rounded-full bg-muted" />
                <span className="size-2.5 rounded-full bg-muted" />
                <span className="size-2.5 rounded-full bg-muted" />
                <span className="ml-3 text-xs font-mono text-muted-foreground">studymate.ai / chat</span>
              </div>
              <div className="grid md:grid-cols-[200px_1fr]">
                <aside className="hidden md:block border-r border-border p-4 space-y-2 bg-background/30">
                  <div className="h-7 rounded-md bg-brand/15 text-brand text-xs font-semibold flex items-center px-2">+ New Chat</div>
                  <div className="pt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Today</div>
                  <div className="text-xs px-2 py-1.5 rounded-md bg-accent">DSA — B+ Trees</div>
                  <div className="text-xs px-2 py-1.5 rounded-md text-muted-foreground">Thermo Recap</div>
                  <div className="text-xs px-2 py-1.5 rounded-md text-muted-foreground">OS Lab Prep</div>
                </aside>
                <div className="p-6 space-y-5 min-h-[320px]">
                  <div className="flex gap-3 justify-end">
                    <div className="bg-brand text-brand-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-md shadow-sm">
                      Explain Eigenvalues for my Linear Algebra mid-term at Anna University?
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="size-7 rounded-full bg-brand shrink-0 grid place-items-center text-[10px] font-bold text-brand-foreground shadow-sm">AI</div>
                    <div className="space-y-2 max-w-lg">
                      <p className="text-sm">For your Anna University (MA8352) syllabus, follow these steps:</p>
                      <ol className="text-sm list-decimal pl-5 space-y-1 text-muted-foreground">
                        <li>Form the characteristic equation <code className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-xs">det(A − λI) = 0</code></li>
                        <li>Solve the polynomial for λ.</li>
                        <li>Substitute back to find eigenvectors.</li>
                      </ol>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-[10px] font-medium px-2 py-1 bg-muted rounded">Generate Quiz</span>
                        <span className="text-[10px] font-medium px-2 py-1 bg-muted rounded">Explain in Tamil</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — only implemented ones */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Everything you need to ace your semester</h2>
          <p className="mt-4 text-muted-foreground">A focused AI study toolkit, built around the way Indian college students actually learn.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="group p-6 rounded-2xl border border-border bg-surface hover:border-brand/40 transition-all hover:-translate-y-1 duration-300">
              <div className="size-10 rounded-xl bg-brand-soft text-brand grid place-items-center mb-4 group-hover:scale-110 transition-transform duration-200">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-bold mb-2 text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-surface/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Start learning in seconds</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative p-6 rounded-2xl border border-border bg-background hover:-translate-y-1 transition-all duration-300">
                <div className="font-mono text-[10px] text-brand mb-3">STEP {String(i + 1).padStart(2, "0")}</div>
                <h4 className="font-bold mb-2 text-foreground">{s.title}</h4>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <ShieldCheck className="size-10 text-brand mx-auto mb-4" />
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Your learning data stays private</h3>
        <p className="text-muted-foreground max-w-xl mx-auto">Your files, chats, and progress are stored securely with row-level encryption. Only you can access your study workspace.</p>
      </section>

      {/* Final CTA */}
      <section id="faq" className="px-6 pb-24">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-brand to-brand/70 p-12 md:p-16 text-center text-brand-foreground relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_50%)] opacity-20" />
          <h2 className="relative text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Start learning smarter today</h2>
          <p className="relative opacity-90 max-w-lg mx-auto mb-8">Join Indian college students using StudyMate AI to study faster and ace exams.</p>
          <Link to="/auth" className="relative inline-block">
            <Button size="lg" variant="secondary" className="rounded-xl px-10 h-12 font-bold btn-premium shadow-md hover:opacity-95">
              Get Started — It's Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="hover:opacity-90 transition-opacity">
            <Logo />
          </Link>
          <div className="flex gap-6 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 StudyMate AI. Built for Indian education.</p>
        </div>
      </footer>
    </div>
  );
}

// Only implemented features shown
const FEATURES = [
  { icon: MessageSquare, title: "AI Doubt Solver", desc: "Ask any topic in English, Tamil, Hindi or Hinglish. Get step-by-step explanations tailored to your syllabus." },
  { icon: ListChecks, title: "Quiz & Flashcards", desc: "Auto-generate MCQs, 2-mark, 5-mark and 16-mark practice questions from any topic or uploaded notes." },
  { icon: GraduationCap, title: "Semester Learning", desc: "Tailored to your college and semester syllabus — not generic content. Supports 40,000+ Indian institutions." },
];

const STEPS = [
  { title: "Sign in with Google", desc: "One-click login, no passwords to remember." },
  { title: "Pick your college & semester", desc: "Search from 40,000+ Indian institutions." },
  { title: "Upload or ask", desc: "Drop notes or ask in plain Hinglish." },
  { title: "Learn faster", desc: "Notes, quizzes, and answers in one place." },
];
