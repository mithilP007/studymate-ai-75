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
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
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
      },
    },
  },
});
