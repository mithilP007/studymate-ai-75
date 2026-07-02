import { createFileRoute } from "@tanstack/react-router";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  messages?: ChatMessage[];
  context?: {
    fullName?: string;
    college?: string;
    semester?: number | string;
    degree?: string;
    department?: string;
    language?: string;
    mode?: string;
  };
}

const SYSTEM = (ctx: ChatRequestBody["context"]) => `You are StudyMate AI — a patient, encouraging study companion for Indian college students.

Student profile:
- Name: ${ctx?.fullName ?? "Student"}
- College: ${ctx?.college ?? "(not set)"}
- Degree / Department: ${ctx?.degree ?? "—"} ${ctx?.department ?? ""}
- Semester: ${ctx?.semester ?? "—"}
- Preferred language: ${ctx?.language ?? "English"}
- Current mode: ${ctx?.mode ?? "Learn"}

Guidelines:
- Tailor explanations to the student's college syllabus and semester when possible.
- Default to clear, simple language. If preferred language is Tamil, Hindi, or Hinglish, respond in that.
- Use Markdown: headings, lists, bold key terms, fenced code blocks for code.
- For Indian university exam answers, use the standard 2-mark / 5-mark / 16-mark format when asked.
- When a topic is complex, break it into steps and end with a one-line "TL;DR".
- Never invent syllabus codes or unit numbers — say "check your syllabus" instead.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ChatRequestBody;
          if (!Array.isArray(body.messages)) {
            return new Response("messages required", { status: 400 });
          }

          const lovableKey = process.env.LOVABLE_API_KEY || process.env.VITE_LOVABLE_API_KEY;
          const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
          const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
          const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

          let gatewayUrl = "";
          let apiKey = "";
          let modelName = "";

          if (lovableKey) {
            gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
            apiKey = lovableKey;
            modelName = "google/gemini-2.5-flash";
          } else if (geminiKey) {
            gatewayUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
            apiKey = geminiKey;
            modelName = "gemini-2.5-flash";
          } else if (groqKey) {
            gatewayUrl = "https://api.groq.com/openai/v1/chat/completions";
            apiKey = groqKey;
            modelName = "llama-3.3-70b-versatile";
          } else if (openaiKey) {
            gatewayUrl = "https://api.openai.com/v1/chat/completions";
            apiKey = openaiKey;
            modelName = "gpt-4o-mini";
          }

          if (!apiKey) {
            console.error("[API Chat Error] No AI API keys configured on server.");
            return new Response(JSON.stringify({ 
              error: "Chat service is not configured yet. Please check server environment variables.",
              details: "Missing API keys: LOVABLE_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY."
            }), { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          const upstream = await fetch(gatewayUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              stream: true,
              messages: [
                { role: "system", content: SYSTEM(body.context) },
                ...body.messages.slice(-20),
              ],
            }),
          });

          if (!upstream.ok || !upstream.body) {
            const text = await upstream.text().catch(() => "");
            if (upstream.status === 429) return new Response("Rate limit reached. Please wait a moment.", { status: 429 });
            if (upstream.status === 402) return new Response("AI credits exhausted. Add credits in your workspace.", { status: 402 });
            return new Response(text || "AI request failed", { status: upstream.status });
          }

          const encoder = new TextEncoder();
          const decoder = new TextDecoder();

          const stream = new ReadableStream({
            async start(controller) {
              const reader = upstream.body!.getReader();
              let buffer = "";
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  let idx;
                  while ((idx = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, idx).trim();
                    buffer = buffer.slice(idx + 1);
                    if (!line.startsWith("data:")) continue;
                    const data = line.slice(5).trim();
                    if (data === "[DONE]") { controller.close(); return; }
                    try {
                      const parsed = JSON.parse(data);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      if (delta) controller.enqueue(encoder.encode(delta));
                    } catch {}
                  }
                }
                controller.close();
              } catch (e) {
                controller.error(e);
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
        } catch (error: any) {
          console.error("[API Chat Error]", error);
          return new Response(JSON.stringify({ 
            error: "Chat service failed", 
            details: error?.message || "An unexpected error occurred." 
          }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      },
    },
  },
});
