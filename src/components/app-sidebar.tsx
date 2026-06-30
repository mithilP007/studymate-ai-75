import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  MessageSquarePlus, BookOpen, FileText, ClipboardList, Layers,
  CalendarDays, TrendingUp, Bookmark, GraduationCap, Settings,
  Search, ChevronLeft, PanelLeftClose, PanelLeftOpen, LogOut,
  User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";

const PRIMARY_NAV = [
  { to: "/app", icon: MessageSquarePlus, label: "New Chat" },
  { to: "/files", icon: FileText, label: "Uploaded Files" },
  { to: "/planner", icon: CalendarDays, label: "Study Planner" },
  { to: "/progress", icon: TrendingUp, label: "Progress" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

const SECONDARY_NAV = [
  { to: "/app", icon: BookOpen, label: "AI Notes" },
  { to: "/app", icon: ClipboardList, label: "Quizzes" },
  { to: "/app", icon: Layers, label: "Flashcards" },
  { to: "/app", icon: Bookmark, label: "Saved Answers" },
  { to: "/app", icon: GraduationCap, label: "Exam Mode" },
] as const;

interface Props {
  activeChatId?: string | null;
  onSelectChat?: (id: string) => void;
  onNewChat?: () => void;
}

export function AppSidebar({ activeChatId, onSelectChat, onNewChat }: Props) {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: chats = [] } = useQuery({
    queryKey: ["chats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("chats")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });

  const filteredChats = chats.filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()));
  const groups = groupChats(filteredChats);

  return (
    <aside
      className={cn(
        "shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out h-dvh",
        collapsed ? "w-[64px]" : "w-[280px]"
      )}
    >
      <div className="h-16 flex items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed && <Logo />}
        <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full bg-brand text-brand-foreground hover:opacity-90 rounded-xl h-10 justify-start gap-2"
        >
          <MessageSquarePlus className="size-4" />
          {!collapsed && <span className="font-medium">New chat</span>}
        </Button>
      </div>

      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="h-9 pl-8 text-sm rounded-lg bg-background"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-2">
        {!collapsed && (
          <div className="space-y-6 py-2">
            {groups.map((g) => g.items.length > 0 && (
              <div key={g.label}>
                <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.label}</div>
                <div className="space-y-0.5">
                  {g.items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelectChat?.(c.id)}
                      className={cn(
                        "w-full text-left text-sm rounded-md px-2 py-1.5 truncate hover:bg-sidebar-accent transition-colors",
                        activeChatId === c.id && "bg-sidebar-accent font-medium"
                      )}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {chats.length === 0 && (
              <div className="px-2 text-xs text-muted-foreground">No chats yet — start a new one above.</div>
            )}

            <div className="pt-2 border-t border-sidebar-border">
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workspace</div>
              <div className="space-y-0.5">
                {[...PRIMARY_NAV.slice(1), ...SECONDARY_NAV].map((item) => (
                  <Link
                    key={item.label + item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 text-sm rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors",
                      pathname === item.to && "bg-sidebar-accent font-medium"
                    )}
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="py-2 flex flex-col items-center gap-1">
            {[...PRIMARY_NAV.slice(1), ...SECONDARY_NAV].map((item) => (
              <Link key={item.label + item.to} to={item.to} className="size-10 grid place-items-center rounded-lg hover:bg-sidebar-accent">
                <item.icon className="size-4" />
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-2 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("w-full flex items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent transition-colors", collapsed && "justify-center")}>
              <div className="size-8 rounded-full bg-brand text-brand-foreground grid place-items-center text-xs font-bold shrink-0">
                {(profile?.full_name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs font-semibold truncate">{profile?.full_name ?? user?.email}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {profile?.college_name ? `${truncate(profile.college_name, 18)} • Sem ${profile?.semester ?? "—"}` : "Profile"}
                  </div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="text-xs text-muted-foreground">Signed in</div>
              <div className="font-medium truncate">{profile?.full_name ?? user?.email}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/settings"><UserIcon className="size-4 mr-2" />Profile & Settings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/progress"><TrendingUp className="size-4 mr-2" />Progress</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive"><LogOut className="size-4 mr-2" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

function groupChats(chats: { id: string; title: string; updated_at: string }[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const g = { today: [] as typeof chats, yesterday: [] as typeof chats, week: [] as typeof chats, older: [] as typeof chats };
  for (const c of chats) {
    const age = now - new Date(c.updated_at).getTime();
    if (age < day) g.today.push(c);
    else if (age < 2 * day) g.yesterday.push(c);
    else if (age < 7 * day) g.week.push(c);
    else g.older.push(c);
  }
  return [
    { label: "Today", items: g.today },
    { label: "Yesterday", items: g.yesterday },
    { label: "Previous 7 days", items: g.week },
    { label: "Older", items: g.older },
  ];
}
