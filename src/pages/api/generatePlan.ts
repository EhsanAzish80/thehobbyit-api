import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

console.log("OPENAI_API_KEY length:", process.env.OPENAI_API_KEY?.length);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Level = "Beginner" | "Intermediate" | "Advanced";

function sanitizeLines(text: string): string[] {
  if (!text) return [];
  const raw = text.replace(/```+/g, "").replace(/\r/g, "").trim();

  let lines = raw.split("\n").map(s => s.trim()).filter(Boolean);

  // Try paragraph split if lines are too few
  if (lines.length < 52) {
    const paras = raw.split(/\n\s*\n/g).map(s => s.trim()).filter(Boolean);
    if (paras.length > lines.length) lines = paras;
  }

  // Remove numbering/bullets
  lines = lines.map(l => l.replace(/^[-*•\d."]+\s*/, "").trim());

  // Enforce exactly 52 lines
  if (lines.length > 52) {
    lines = lines.slice(0, 52);
  } else if (lines.length < 52) {
    lines = lines.concat(
      Array(52 - lines.length).fill(
        "Practice for 20 minutes and review last week."
      )
    );
  }

  return lines;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("Incoming body:", req.body);
  console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);

  const { hobby, level, minutes, languageCode } = req.body ?? {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }
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

  const prompt = `
You are a concise, motivational coach generating learning plans.
Target language (BCP-47): ${languageCode}
Learner level: ${level}
Time available: ${weeklyMinutes} minutes per week
Hobby: ${hobby}

Create a progressive 52-week plan.
Each WEEK must be ONE LINE, with 2–3 short actionable sentences fitting the time budget.
Include a main focus and an optional bonus. Keep vocabulary simple and upbeat.

STRICT OUTPUT FORMAT:
- Return EXACTLY 52 lines.
- No numbering. No bullets. No quotes. No headings. No extra commentary.
- Each line ≤ 300 characters.
`.trim();

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt,
      max_output_tokens: 1200
    });

    // New API: response.output_text is the safe, concatenated text
    const text = response.output_text || "";
    const plan = sanitizeLines(text);

    return res.status(200).json({ plan });
  } catch (err: any) {
    console.error("[/api/generatePlan] error:", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
