// src/pages/api/generatePlan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { verifyToken } from "../../lib/hmac";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Level = "Beginner" | "Intermediate" | "Advanced";

function sanitizeLines(text: string): string[] {
  if (!text) return [];
  const raw = text.replace(/```+/g, "").replace(/\r/g, "").trim();

  let lines = raw.split("\n").map(s => s.trim()).filter(Boolean);
  if (lines.length < 52) {
    const paras = raw.split(/\n\s*\n/g).map(s => s.trim()).filter(Boolean);
    if (paras.length > lines.length) lines = paras;
  }
  lines = lines.map(l => l.replace(/^[-*•\d."]+\s*/, "").trim());

  if (lines.length > 52) lines = lines.slice(0, 52);
  else if (lines.length < 52) {
    lines = lines.concat(
      Array(52 - lines.length).fill("Practice for 20 minutes and review last week.")
    );
  }
  return lines;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const started = Date.now();

  // ---- Auth (HMAC) ---------------------------------------------------------
  const authz =
    req.headers.authorization || (req.headers["x-client-token"] as string | undefined);
  const token = authz?.startsWith("Bearer ") ? authz.slice(7) : authz;

  try {
    if (!token) return res.status(401).json({ error: "Missing token" });
    const claims = verifyToken(token);
    if (claims.aud !== "generatePlan") return res.status(403).json({ error: "Bad audience" });
  } catch (e: any) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { hobby, level, minutes, languageCode } = req.body ?? {};

  // Normalize level so it works regardless of case
  const normalizedLevel: Level | "" =
    typeof level === "string"
      ? (level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()) as Level
      : "";

  // ---- Validate inputs ------------------------------------------------------
  if (!process.env.OPENAI_API_KEY)
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  if (typeof hobby !== "string" || hobby.trim().length === 0 || hobby.length > 80)
    return res.status(400).json({ error: "Invalid hobby" });
  if (!["Beginner", "Intermediate", "Advanced"].includes(normalizedLevel))
    return res.status(400).json({ error: "Invalid level" });
  const weeklyMinutes = Number(minutes);
  if (!Number.isFinite(weeklyMinutes) || weeklyMinutes < 15 || weeklyMinutes > 600)
    return res.status(400).json({ error: "Invalid minutes" });
  if (typeof languageCode !== "string" || !/^[A-Za-z-]{2,8}$/.test(languageCode))
    return res.status(400).json({ error: "Invalid languageCode" });

  // ---- Build prompt ---------------------------------------------------------
  const prompt = `
You are a concise, motivational coach generating learning plans.
Target language (BCP-47): ${languageCode}
Learner level: ${normalizedLevel}
Time available: ${weeklyMinutes} minutes per week
Hobby: ${hobby}

Create a progressive 52-week plan.
Each WEEK must be ONE LINE, with 2–3 short actionable sentences fitting the time budget.
Include a main focus and an optional bonus. Keep vocabulary simple and upbeat.

STRICT OUTPUT FORMAT:
- Return EXACTLY 52 lines.
- No numbering. No bullets. No quotes. No headings. No extra commentary.
- Each line ≤ 300 characters.
- Do NOT include the text "Week" in the output — the system will add it.
`.trim();

  // ---- Call OpenAI ----------------------------------------------------------
  try {
    console.info("[/api/generatePlan] calling OpenAI…", {
      hobby,
      level: normalizedLevel,
      minutes: weeklyMinutes,
      languageCode,
    });

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt,
      max_output_tokens: 1200,
    });

    // Be very defensive extracting raw text
    const text =
      (response as any)?.output_text ??
      (response as any)?.content?.[0]?.text ??
      (response as any)?.output?.[0]?.content?.[0]?.text ??
      (response as any)?.choices?.[0]?.message?.content ??
      "";

    console.info("[/api/generatePlan] rawText length:", text?.length ?? 0);

    // Echo raw text back for debugging on the client
    let plan: string[] = [];
    if (typeof text === "string" && text.trim().length > 0) {
      plan = sanitizeLines(text).map((line, i) => `Week ${i + 1}: ${line}`);
    }

    console.info("[/api/generatePlan] plan lines:", plan.length, "elapsed(ms):", Date.now() - started);

    // Return both raw and parsed so the app can decide what to show
    return res.status(200).json({
      rawText: text ?? "",
      plan,
    });
  } catch (err: any) {
    console.error("[/api/generatePlan] provider error:", err?.message || err);
    return res.status(500).json({ error: "Provider error" });
  }
}
