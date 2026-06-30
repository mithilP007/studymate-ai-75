import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Sparkles, ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/files")({
  ssr: false,
  head: () => ({ meta: [{ title: "Uploaded Files — StudyMate AI" }] }),
  component: FilesPage,
});

function FilesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["uploads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("uploads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: e1 } = await supabase.storage.from("study-materials").upload(path, file);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("uploads").insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type || file.name.split(".").pop() || "file",
        file_url: path,
        file_size: file.size,
      });
      if (e2) throw e2;
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey: ["uploads", user.id] });
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string, path: string) => {
    await supabase.storage.from("study-materials").remove([path]);
    await supabase.from("uploads").delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["uploads", user?.id] });
  };

  return (
    <div className="flex h-dvh bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Uploaded Files</h1>
              <p className="text-sm text-muted-foreground mt-1">Notes, PDFs, slides, and images you've shared with StudyMate.</p>
            </div>
            <input ref={inputRef} type="file" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading} className="bg-brand text-brand-foreground hover:opacity-90 rounded-xl">
              <Upload className="size-4 mr-2" />{uploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-3">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <FileText className="size-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">Upload your first notes to start learning faster</h3>
              <p className="text-sm text-muted-foreground mb-6">PDFs, DOCs, slides, and images all work.</p>
              <Button onClick={() => inputRef.current?.click()} variant="outline" className="rounded-xl">
                <Upload className="size-4 mr-2" /> Upload File
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
              {files.map((f) => (
                <div key={f.id} className="p-4 flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-brand-soft text-brand grid place-items-center shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{f.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.file_type} • {Math.round((f.file_size ?? 0) / 1024)} KB • {new Date(f.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="sm"><Link to="/app"><Sparkles className="size-4 mr-1" />Summarize</Link></Button>
                    <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/app"><ListChecks className="size-4 mr-1" />Quiz</Link></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(f.id, f.file_url)} className="text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
