// src/pages/api/generatePlan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { verifyToken } from "../../lib/hmac";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeLines(text: string): string[] {
  if (!text) return [];
  const raw = text.replace(/```+/g, "").replace(/\r/g, "").trim();
  let lines = raw.split("\n").map(s => s.trim()).filter(Boolean);
  if (lines.length < 52) {
    const paras = raw.split(/\n\s*\n/g).map(s => s.trim()).filter(Boolean);
    if (paras.length > lines.length) lines = paras;
  }
  return lines.map(l => l.replace(/^[-*•\d."]+\s*/, "").trim());
}

async function genChunk(basePrompt: string, start: number, end: number): Promise<string[]> {
  const chunkPrompt = `${basePrompt}

Generate ONLY weeks ${start} through ${end}.
Return EXACTLY ${end - start + 1} lines.
No numbering, no bullets, no quotes.`.trim();

  const resp = await client.responses.create({
    model: "gpt-5-mini",
    input: chunkPrompt,
    max_output_tokens: 900,
    reasoning: { effort: "low" },
    text: { format: { type: "text" } },
  });

  const text = (resp.output_text || "").trim();
  if (!text) {
    console.warn(`[chunk ${start}-${end}] empty output_text`, JSON.stringify(resp));
    return [];
  }
  return sanitizeLines(text).slice(0, end - start + 1);
}

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

  const { hobby, level, minutes, languageCode } = req.body ?? {};
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  if (typeof hobby !== "string" || hobby.trim().length === 0 || hobby.length > 80) return res.status(400).json({ error: "Invalid hobby" });
  if (!["Beginner", "Intermediate", "Advanced"].includes(level)) return res.status(400).json({ error: "Invalid level" });
  const weeklyMinutes = Number(minutes);
  if (!Number.isFinite(weeklyMinutes) || weeklyMinutes < 15 || weeklyMinutes > 600) return res.status(400).json({ error: "Invalid minutes" });
  if (typeof languageCode !== "string" || !/^[A-Za-z-]{2,8}$/.test(languageCode)) return res.status(400).json({ error: "Invalid languageCode" });

  try {
    // 1️⃣ Determine the target week number
    let targetWeek = 1;
    // TODO: Replace this with your own DB/SwiftData query
    // Example:
    // const lastStep = await db.getLastStepForHobby(hobby);
    // if (lastStep) targetWeek = lastStep.week + 1;

    const basePrompt = `
You are a concise, motivational coach generating a learning plan for one specific week.
Target language (BCP-47): ${languageCode}
Learner level: ${level}
Time available: ${weeklyMinutes} minutes per week
Hobby: ${hobby}

Generate ONLY week ${targetWeek} in ONE LINE with 5–7 short actionable sentences fitting the time budget.
Include a main focus and an optional bonus. Keep vocabulary simple and upbeat.

STRICT OUTPUT FORMAT:
- Exactly one line.
- No numbering, bullets, quotes, or headings.
- ≤ 300 characters.
`.trim();

    // 2️⃣ Ask the model for only the requested week
    const result = await genChunk(basePrompt, targetWeek, targetWeek);
    const weekText = (result && result[0]) || "Practice for 20 minutes and review last week.";

    // 3️⃣ Return it
    return res.status(200).json({ week: targetWeek, text: weekText });
  } catch (err: any) {
    console.error("[/api/generatePlan] error:", err?.message || err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
