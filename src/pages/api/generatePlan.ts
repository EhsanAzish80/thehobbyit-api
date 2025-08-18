// src/pages/api/generatePlan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { verifyToken } from "../../lib/hmac";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- helpers ---------------------------------------------------------------

function firstTidyLine(text: string): string {
  if (!text) return "";
  const raw = text.replace(/```+/g, "").replace(/\r/g, "").trim();
  // prefer per-line split; fall back to paragraph split if needed
  let lines = raw.split("\n").map(s => s.trim()).filter(Boolean);
  if (lines.length === 0) {
    lines = raw.split(/\n\s*\n/g).map(s => s.trim()).filter(Boolean);
  }
  // strip bullets/numbering
  const line = (lines[0] || raw).replace(/^[-*•\d."]+\s*/, "").trim();
  // soft clamp ~300 chars
  return line.length > 300 ? line.slice(0, 300).trim() : line;
}

async function callModel(prompt: string, maxTokens = 600): Promise<string> {
  const resp = await client.responses.create({
    model: "gpt-5-mini",
    input: prompt,
    // keep it simple; no temperature param (unsupported on some models)
    max_output_tokens: maxTokens,
    text: { format: { type: "text" } },
  });
  return (resp.output_text || "").trim();
}

// --- route ----------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth: long-lived device token
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    await verifyToken(token, "generatePlan");
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const {
    hobby,
    level,
    minutes,
    languageCode,
    // new fields:
    mode = "week",
    targetWeek,
    weekText,
  } = req.body ?? {};

  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  if (typeof hobby !== "string" || hobby.trim().length === 0 || hobby.length > 80) {
    return res.status(400).json({ error: "Invalid hobby" });
  }
  if (!["Beginner", "Intermediate", "Advanced"].includes(level)) {
    return res.status(400).json({ error: "Invalid level" });
  }
  const weeklyMinutes = Number(minutes);
  if (!Number.isFinite(weeklyMinutes) || weeklyMinutes < 15 || weeklyMinutes > 600) {
    return res.status(400).json({ error: "Invalid minutes" });
  }
  if (typeof languageCode !== "string" || !/^[A-Za-z-]{2,8}$/.test(languageCode)) {
    return res.status(400).json({ error: "Invalid languageCode" });
  }

  try {
    if (mode === "guide") {
      if (typeof weekText !== "string" || weekText.trim().length === 0) {
        return res.status(400).json({ error: "Missing weekText for guide" });
      }

      const prompt = `
You are a concise, motivational coach.
Target language (BCP-47): ${languageCode}
Learner level: ${level}
Time available: ${weeklyMinutes} minutes per week
Hobby: ${hobby}

The user is working on this week's plan:
"${weekText}"

Write a brief, practical HOW-TO to execute this plan TODAY.
Return a short, skimmable block, no filler, using compact phrases (no long paragraphs).
Include these labeled sections:

STEPS — 3–5 bullet lines, exact actions in order.
COMMON MISTAKE — 1 short line.
DRILL — 1–2 lines for a focused mini-exercise.

Keep total under ~900 characters. Avoid emojis and markdown headings.
`.trim();

      const text = await callModel(prompt, 800);
      const out = text || "STEPS — 1) Follow the plan in small chunks. 2) Count/time your reps. 3) Record 30 seconds.\nCOMMON MISTAKE — Rushing tempo.\nDRILL — 5 minutes slow, then 5 minutes at target pace.";
      return res.status(200).json({ guide: out });
    }

    if (mode === "details") {
      if (typeof weekText !== "string" || weekText.trim().length === 0) {
        return res.status(400).json({ error: "Missing weekText for details" });
      }

      const prompt = `
You are a concise, motivational coach.
Target language (BCP-47): ${languageCode}
Learner level: ${level}
Time available: ${weeklyMinutes} minutes per week
Hobby: ${hobby}

The user is working on this week's plan:
"${weekText}"

Expand with brief, pragmatic context.
Return a short block with these sections:

WHY — 1–2 lines on the training goal.
CHECKPOINTS — 3 bullet lines with observable signs of success.
NEXT — 1 line suggesting the logical follow-up for next week.

Keep total under ~900 characters. No fluff, no markdown headings, no emojis.
`.trim();

      const text = await callModel(prompt, 800);
      const out = text || "WHY — Build core skill with focused reps.\nCHECKPOINTS — Steady tempo • Clean transitions • Relaxed posture\nNEXT — Add one new variation at the same tempo.";
      return res.status(200).json({ details: out });
    }

    // default: mode === "week"
    const wk = Number.isFinite(Number(targetWeek)) && Number(targetWeek) >= 1 ? Number(targetWeek) : 1;

    const prompt = `
You are a concise, motivational coach generating a learning plan for one specific week.
Target language (BCP-47): ${languageCode}
Learner level: ${level}
Time available: ${weeklyMinutes} minutes per week
Hobby: ${hobby}

Generate ONLY week ${wk} as ONE LINE with 2–3 short actionable sentences that fit the time budget.
Include a main focus and an optional bonus. Keep vocabulary simple and upbeat.

STRICT OUTPUT FORMAT:
- Exactly one line.
- No numbering, bullets, quotes, or headings.
- ≤ 300 characters.
`.trim();

    const text = await callModel(prompt, 320);
    const line = firstTidyLine(text) || "Practice in short focused blocks; review last week briefly; one deliberate drill.";

    return res.status(200).json({ week: wk, text: line });
  } catch (err: any) {
    console.error("[/api/generatePlan] error:", err?.message || err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
