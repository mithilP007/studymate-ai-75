import { Moon, Sun, Palette } from "lucide-react";
import { useTheme, type Accent } from "./theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: "indigo", label: "Indigo", color: "hsl(243 75% 59%)" },
  { id: "cyan", label: "Cyan", color: "hsl(190 95% 45%)" },
  { id: "emerald", label: "Emerald", color: "hsl(160 84% 39%)" },
  { id: "violet", label: "Violet", color: "hsl(262 83% 65%)" },
  { id: "rose", label: "Rose", color: "hsl(346 84% 60%)" },
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
      className="rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

/** Palette picker — accent colours only */
export function PersonalizeToggle() {
  const { accent, setAccent } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Personalize accent colour" className="rounded-full">
          <Palette className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <Palette className="size-3.5" /> Accent colour
        </DropdownMenuLabel>
        <div className="flex items-center gap-2 px-3 py-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccent(a.id)}
              className={`size-7 rounded-full ring-2 transition-all ${
                accent === a.id ? "ring-foreground" : "ring-transparent hover:ring-border"
              }`}
              style={{ backgroundColor: a.color }}
              aria-label={a.label}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
