import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative size-8 rounded-lg bg-brand flex items-center justify-center glow-brand">
        <svg viewBox="0 0 24 24" className="size-4 text-brand-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>
      <span className="font-bold text-lg tracking-tight">StudyMate <span className="text-brand">AI</span></span>
    </div>
  );
}
