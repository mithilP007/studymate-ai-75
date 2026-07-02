import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { useTheme, type Accent, type Theme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
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
    { id: "emerald", label: "Emerald", emoji: "🌿", desc: "Clean and focused green theme", mainColor: "hsl(160 84% 39%)", secColor: "hsl(160 84% 39% / 0.22)" },
    { id: "ocean", label: "Ocean", emoji: "🌊", desc: "Cool blue theme for long study sessions", mainColor: "hsl(200 95% 45%)", secColor: "hsl(200 95% 45% / 0.22)" },
    { id: "lavender", label: "Lavender", emoji: "💜", desc: "Soft purple for a calm experience", mainColor: "hsl(262 83% 65%)", secColor: "hsl(262 83% 65% / 0.22)" },
    { id: "sunset", label: "Sunset", emoji: "🔥", desc: "Warm orange theme with energetic accents", mainColor: "hsl(20 90% 55%)", secColor: "hsl(20 90% 55% / 0.22)" },
    { id: "mono", label: "Mono", emoji: "⚫", desc: "Minimal grayscale theme", mainColor: "hsl(220 10% 45%)", secColor: "hsl(220 10% 45% / 0.22)" },
  ];

/** One-click Sun ↔ Moon toggle */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full btn-premium"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark
        ? <Sun className="size-4 transition-transform duration-300 rotate-0" />
        : <Moon className="size-4 transition-transform duration-300 rotate-0" />
      }
    </Button>
  );
}

/** Combined Appearance + Theme Preset popover */
export function PersonalizeToggle() {
  const { theme, setTheme, accent, setAccent } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Personalise appearance and theme"
          className="rounded-full btn-premium"
        >
          <Palette className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      {/* side=bottom align=end keeps the panel directly below the button, right-aligned */}
      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={10}
        className={[
          "w-80 p-0 rounded-2xl border border-border/70 shadow-2xl",
          "bg-popover/98 backdrop-blur-xl",
          /* Radix open / close animations via tw-animate-css */
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "data-[state=open]:slide-in-from-top-[6px] data-[state=open]:duration-[220ms] data-[state=open]:ease-out",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          "data-[state=closed]:slide-out-to-top-[4px] data-[state=closed]:duration-[180ms]",
        ].join(" ")}
      >
        {/* ── Appearance ─────────────────────────────────────── */}
        <div className="p-4 space-y-2.5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest select-none">
            Appearance
          </p>
          <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-xl">
            {(["light", "dark", "system"] as Theme[]).map((t) => {
              const active = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  aria-pressed={active}
                  className={[
                    "flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold capitalize cursor-pointer select-none",
                    "transition-all duration-[180ms] ease-out",
                    active
                      ? "bg-background shadow-md text-foreground border border-border/60"
                      : "text-muted-foreground border border-transparent hover:text-foreground hover:-translate-y-0.5 hover:bg-muted/60",
                  ].join(" ")}
                >
                  {t === "light" && <Sun className="size-3.5 mb-1 text-brand" />}
                  {t === "dark" && <Moon className="size-3.5 mb-1 text-brand" />}
                  {t === "system" && <Monitor className="size-3.5 mb-1 text-brand" />}
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator className="m-0" />

        {/* ── Theme Presets ───────────────────────────────────── */}
        <div className="p-4 space-y-2.5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest select-none">
            Theme Presets
          </p>

          <div className="space-y-1.5">
            {ACCENTS.map((a) => {
              const active = accent === a.id;
              return (
                /* theme-btn is the CSS hook for the tooltip delay trick */
                <div key={a.id} className="relative theme-btn">

                  {/* ── Dark tooltip (CSS-only, 100ms enter delay) ── */}
                  <div
                    className="theme-tooltip absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 w-56 rounded-xl border border-white/10 bg-gray-950/95 p-3 shadow-xl text-left"
                    role="tooltip"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <span>{a.emoji}</span>
                      <span>{a.label}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-normal leading-relaxed text-gray-400">
                      {a.desc}
                    </p>
                  </div>

                  {/* ── Theme row button ───────────────────────── */}
                  <button
                    onClick={() => setAccent(a.id)}
                    aria-pressed={active}
                    className={[
                      "w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer",
                      "transition-all duration-[180ms] ease-out",
                      active
                        ? "border-brand bg-brand-soft/25 ring-1 ring-brand/60"
                        : "border-border/50 hover:border-brand/40 hover:bg-muted/35",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      {/* Swatch — CSS class handles scale-1.1 on parent hover */}
                      <div className="flex -space-x-1.5">
                        <span
                          className={[
                            "theme-swatch size-4 rounded-full border-2 border-background shadow-sm",
                            active ? "shadow-[0_0_0_2px_var(--brand),0_0_8px_var(--brand)]" : "",
                          ].join(" ")}
                          style={{ backgroundColor: a.mainColor }}
                        />
                        <span
                          className="theme-swatch size-4 rounded-full border-2 border-background shadow-sm opacity-60"
                          style={{ backgroundColor: a.secColor }}
                        />
                      </div>

                      <span className="text-xs font-bold text-foreground">{a.label}</span>
                    </div>

                    {/* Mini-card preview */}
                    <div className="w-14 h-9 shrink-0 rounded-md border border-border/70 bg-card/50 p-1 flex flex-col justify-between overflow-hidden shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="size-1 rounded-full shrink-0" style={{ backgroundColor: a.mainColor }} />
                        <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: a.mainColor }} />
                      </div>
                      <div className="h-0.5 w-8 rounded-full bg-muted-foreground/25" />
                      <div className="flex justify-between items-center">
                        <div className="h-0.5 w-4 rounded-full bg-muted-foreground/15" />
                        <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: a.mainColor }} />
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
