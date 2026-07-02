import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { useTheme, type Accent, type Theme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCENTS: {
  id: Accent;
  label: string;
  emoji: string;
  desc: string;
  mainColor: string;
  secColor: string;
}[] = [
  { id: "emerald", label: "Emerald", emoji: "🌿", desc: "Clean and focused green theme", mainColor: "hsl(160 84% 39%)", secColor: "hsl(160 84% 39% / 0.2)" },
  { id: "ocean", label: "Ocean", emoji: "🌊", desc: "Cool blue theme for long study sessions", mainColor: "hsl(200 95% 45%)", secColor: "hsl(200 95% 45% / 0.2)" },
  { id: "lavender", label: "Lavender", emoji: "💜", desc: "Soft purple for a calm experience", mainColor: "hsl(262 83% 65%)", secColor: "hsl(262 83% 65% / 0.2)" },
  { id: "sunset", label: "Sunset", emoji: "🔥", desc: "Warm orange theme with energetic accents", mainColor: "hsl(20 90% 55%)", secColor: "hsl(20 90% 55% / 0.2)" },
  { id: "mono", label: "Mono", emoji: "⚫", desc: "Minimal grayscale theme", mainColor: "hsl(220 10% 45%)", secColor: "hsl(220 10% 45% / 0.2)" },
];

/** Simple sun/moon toggle — one click switches dark ↔ light */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full transition-transform active:scale-95 duration-200"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4 text-foreground" /> : <Moon className="size-4 text-foreground" />}
    </Button>
  );
}

/** Palette and appearance controller */
export function PersonalizeToggle() {
  const { theme, setTheme, accent, setAccent } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Personalize appearance and accent" className="rounded-full transition-transform active:scale-95 duration-200">
          <Palette className="size-4 text-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden border-border/80 shadow-2xl bg-popover/95 backdrop-blur-md">
        {/* Appearance modes */}
        <div className="p-4 space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Appearance</span>
          <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-xl">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  theme === t
                    ? "bg-background shadow-md text-foreground border-border border"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {t === "light" && <Sun className="size-3.5 mb-1 text-brand" />}
                {t === "dark" && <Moon className="size-3.5 mb-1 text-brand" />}
                {t === "system" && <Monitor className="size-3.5 mb-1 text-brand" />}
                {t}
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator className="m-0" />

        {/* Theme presets */}
        <div className="p-4 space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Theme Presets</span>
          <div className="grid grid-cols-1 gap-1.5">
            {ACCENTS.map((a) => {
              const isActive = accent === a.id;
              return (
                <div key={a.id} className="relative group">
                  {/* Floating Tooltip */}
                  <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-1 w-64 opacity-0 translate-y-1 scale-95 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-250 cubic-bezier(0.16, 1, 0.3, 1) z-50 rounded-xl border border-border/80 bg-background/95 backdrop-blur-md shadow-xl p-3 text-left">
                    <div className="font-bold flex items-center gap-1.5 text-foreground text-xs">
                      <span>{a.emoji}</span>
                      <span>{a.label}</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5 font-medium text-[11px] leading-relaxed">{a.desc}</div>
                  </div>

                  {/* Theme Button */}
                  <button
                    onClick={() => setAccent(a.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left cursor-pointer ${
                      isActive
                        ? "border-brand bg-brand-soft/20 ring-1 ring-brand"
                        : "border-border/55 hover:border-brand/45 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Color dots */}
                      <div className="flex -space-x-1">
                        <span className="size-3 rounded-full border border-background shadow-sm" style={{ backgroundColor: a.mainColor }} />
                        <span className="size-3 rounded-full border border-background shadow-sm" style={{ backgroundColor: a.secColor }} />
                      </div>
                      <span className="text-xs font-bold text-foreground">{a.label}</span>
                    </div>

                    {/* Mini Card Preview */}
                    <div className="w-14 h-9 rounded-md border border-border bg-card/60 p-1 flex flex-col justify-between overflow-hidden relative shadow-sm">
                      {/* Mini card header lines */}
                      <div className="flex items-center gap-1">
                        <span className="size-1 rounded-full shrink-0" style={{ backgroundColor: a.mainColor }} />
                        <span className="h-0.5 w-6 rounded-full" style={{ backgroundColor: a.mainColor }} />
                      </div>
                      {/* Mini card body line */}
                      <div className="h-0.5 w-9 rounded-full bg-muted-foreground/30" />
                      {/* Mini card interactive action */}
                      <div className="flex justify-between items-center mt-auto">
                        <div className="h-0.5 w-4 rounded-full bg-muted-foreground/20" />
                        <span className="h-1.5 w-3 rounded-full shadow-sm" style={{ backgroundColor: a.mainColor }} />
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
