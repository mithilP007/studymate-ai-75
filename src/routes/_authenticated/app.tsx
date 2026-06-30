import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Send, Plus, Mic, Sparkles, FileText, ListChecks, CalendarDays,
  Image as ImageIcon, Code2, Languages, Copy, RefreshCw, ThumbsUp,
  ThumbsDown, Bookmark, Loader2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  ssr: false,
  head: () => ({ meta: [{ title: "Learning Space — StudyMate AI" }] }),
  component: Dashboard,
});

interface Msg { id: string; role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  { icon: FileText, title: "Summarize my PDF notes", prompt: "I'm going to upload a PDF. Summarize it into clear unit-wise notes." },
  { icon: Sparkles, title: "Explain a topic simply", prompt: "Explain the concept of recursion in computer science in a simple, beginner-friendly way." },
  { icon: ListChecks, title: "Create 10 quiz questions", prompt: "Create 10 MCQ quiz questions on Data Structures with answers." },
  { icon: CalendarDays, title: "Make a study timetable", prompt: "Make me a 7-day study timetable for my upcoming semester exams across 5 subjects." },
  { icon: Code2, title: "Solve a coding problem", prompt: "Solve: given an array of integers, return the indices of the two numbers that add up to a target. Explain your approach in C++." },
  { icon: ImageIcon, title: "Explain a diagram", prompt: "I'll describe a diagram. Help me understand it and break down each part." },
];

const MODES = ["Learn", "Summarize", "Quiz", "Code Help", "Exam Prep", "Project Help"];

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState("Learn");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!chatId) { setMessages([]); return; }
    supabase.from("messages").select("id,role,content").eq("chat_id", chatId).order("created_at")
      .then(({ data }) => setMessages((data ?? []).map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }))));
  }, [chatId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const ensureChat = async (firstMsg: string): Promise<string> => {
    if (chatId) return chatId;
    const title = firstMsg.slice(0, 60);
    const { data, error } = await supabase.from("chats").insert({ user_id: user!.id, title }).select("id").single();
    if (error) throw error;
    setChatId(data.id);
    qc.invalidateQueries({ queryKey: ["chats", user?.id] });
    return data.id;
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content };
    const placeholder: Msg = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages((m) => [...m, userMsg, placeholder]);
    setStreaming(true);

    try {
      const id = await ensureChat(content);
      await supabase.from("messages").insert({ chat_id: id, user_id: user!.id, role: "user", content });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages.map(({ role, content }) => ({ role, content })), { role: "user", content }],
          context: {
            fullName: profile?.full_name,
            college: profile?.college_name,
            semester: profile?.semester,
            degree: profile?.degree,
            department: profile?.department,
            language: profile?.preferred_language,
            mode,
          },
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        throw new Error(err || "AI request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
          return copy;
        });
      }

      await supabase.from("messages").insert({ chat_id: id, user_id: user!.id, role: "assistant", content: acc });
      await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", id);

      // bump daily progress
      const today = new Date().toISOString().slice(0, 10);
      await supabase.rpc; // noop; use upsert below
      await supabase.from("study_progress").upsert(
        { user_id: user!.id, date: today, chats_count: 1, study_minutes: 2 },
        { onConflict: "user_id,date", ignoreDuplicates: false },
      );
    } catch (e: any) {
      toast.error("Could not send message", { description: e?.message });
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const newChat = () => { setChatId(null); setMessages([]); };

  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden">
      <AppSidebar activeChatId={chatId} onSelectChat={setChatId} onNewChat={newChat} />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{profile?.college_name ?? "Set your college"}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">• Semester {profile?.semester ?? "—"} • {profile?.degree} {profile?.department}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[10px] text-muted-foreground">Mode</span>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-8 text-xs w-auto gap-1 rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>{MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
            {messages.length === 0 ? (
              <div className="animate-fade-up">
                <div className="text-center mb-10">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Hi {firstName(profile?.full_name)}, what do you want to learn today?
                  </h1>
                  <p className="mt-2 text-muted-foreground text-sm">
                    {profile?.college_name ? `${profile.college_name} • Semester ${profile?.semester ?? "—"}` : "Set up your profile to personalize answers"}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => send(s.prompt)}
                      className="p-4 text-left border border-border bg-surface rounded-xl hover:border-brand/40 hover:bg-accent transition-all"
                    >
                      <s.icon className="size-4 text-brand mb-2" />
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.prompt}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} streaming={streaming && m === messages[messages.length - 1]} onQuickAction={send} />
                ))}
                <div ref={endRef} />
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
            <div className="rounded-2xl border border-border bg-surface focus-within:border-brand/50 transition-colors shadow-sm">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask a doubt, upload notes, or start studying…"
                rows={1}
                className="border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pt-3 pb-1 text-sm bg-transparent max-h-48"
              />
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 rounded-lg"><Plus className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => toast.info("Upload from the Files page (coming inline next).")}><FileText className="size-4 mr-2" />Upload PDF / Doc</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Image uploads coming inline.")}><ImageIcon className="size-4 mr-2" />Upload image</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Paste a YouTube or website URL in your message.")}><Languages className="size-4 mr-2" />Add link</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => toast.info("Voice input coming soon")}><Mic className="size-4" /></Button>
                </div>
                <Button
                  onClick={() => send(input)}
                  disabled={!input.trim() || streaming}
                  size="icon"
                  className="size-9 rounded-lg bg-brand text-brand-foreground hover:opacity-90"
                >
                  {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">StudyMate AI may make mistakes — always cross-check critical answers with your syllabus.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function firstName(n?: string | null) { return (n ?? "there").split(" ")[0]; }

function MessageBubble({ msg, streaming, onQuickAction }: { msg: Msg; streaming: boolean; onQuickAction: (p: string) => void }) {
  const isUser = msg.role === "user";
  const copy = () => { navigator.clipboard.writeText(msg.content); toast.success("Copied"); };

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="bg-brand text-brand-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="size-7 rounded-full bg-brand grid place-items-center text-[10px] font-bold text-brand-foreground shrink-0">AI</div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:text-foreground prose-code:text-brand prose-code:before:hidden prose-code:after:hidden">
          {msg.content ? <ReactMarkdown>{msg.content}</ReactMarkdown> : <span className="inline-block size-2 rounded-full bg-brand animate-pulse" />}
        </div>
        {!streaming && msg.content && (
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <ActionPill icon={Copy} label="Copy" onClick={copy} />
            <ActionPill icon={RefreshCw} label="Regenerate" />
            <ActionPill icon={ThumbsUp} label="" />
            <ActionPill icon={ThumbsDown} label="" />
            <ActionPill icon={Bookmark} label="Save" />
            <span className="mx-1 h-4 w-px bg-border" />
            <ActionPill label="Convert to Notes" onClick={() => onQuickAction(`Convert this answer into clean structured notes:\n\n${msg.content.slice(0, 600)}`)} />
            <ActionPill label="Generate Quiz" onClick={() => onQuickAction(`Generate 5 quiz questions from this:\n\n${msg.content.slice(0, 600)}`)} />
            <ActionPill label="Explain simpler" onClick={() => onQuickAction(`Explain this in much simpler beginner-friendly words:\n\n${msg.content.slice(0, 600)}`)} />
            <ActionPill label="Explain in Tamil" onClick={() => onQuickAction(`Explain the above answer in Tamil.`)} />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionPill({ icon: Icon, label, onClick }: { icon?: any; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
      {Icon && <Icon className="size-3" />}
      {label}
    </button>
  );
}
