# Vercel Environment Variables Setup Guide

To ensure that your StudyMate AI deployment runs correctly on Vercel, you need to configure the following environment variables in your Vercel Project settings.

---

## 1. Frontend Client Configuration
These keys are read by Vite during build time and are exposed to the client browser. They are required to initialize the Supabase client.

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | The public API URL of your Supabase project. | `https://owthncqhxwuhmaseozgu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The public `anon` API key of your Supabase project. | `sb_publishable_xPdUAEfteDDLAT1pgtoRcg_NufDyAgb` |

> [!WARNING]
> Never prepend `VITE_` to any database service role keys or secret administrative credentials. They must never be exposed to the client.

---

## 2. Server & API Configuration
These keys are read securely by serverless API endpoints (like `/api/chat`) and are never exposed to the client browser.

| Variable Name | Description | Required For |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key. | Native Gemini model routing (`gemini-2.5-flash`) |
| `GROQ_API_KEY` | Groq Developer API key. | Groq routing (`llama-3.3-70b-versatile`) |
| `OPENAI_API_KEY` | OpenAI Developer API key. | OpenAI routing (`gpt-4o-mini`) |
| `LOVABLE_API_KEY` | Lovable Cloud AI Gateway key. | Lovable AI gateway routing (`google/gemini-2.5-flash`) |

> [!NOTE]
> The chat API endpoint (`/api/chat`) is built with a smart auto-selector. You only need to provide **one** of the keys above (e.g. `GEMINI_API_KEY` or `GROQ_API_KEY` or `OPENAI_API_KEY` or `LOVABLE_API_KEY`) on Vercel, and the API will automatically adapt to route requests through that provider!

---

## How to Configure in Vercel:
1. Go to your [Vercel Dashboard](https://vercel.com).
2. Select your **StudyMate AI** project.
3. Click on the **Settings** tab at the top.
4. Select **Environment Variables** in the left sidebar.
5. Add your keys one by one and click **Save**.
6. Trigger a **Redeploy** on Vercel to bake the settings in.
