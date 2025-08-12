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

  return lines;
}

// helper: one chunk (e.g., weeks 1–13)
async function genChunk(
  client: OpenAI,
  basePrompt: string,
  start: number,
  end: number
): Promise<string[]> {
  const chunkPrompt = `${basePrompt}

Generate ONLY weeks ${start} through ${end}.
Return EXACTLY ${end - start + 1} lines.
No numbering, no bullets, no quotes.`.trim();

  const resp = await client.responses.create({
    model: "gpt-5-mini",
    input: chunkPrompt,
    max_output_tokens: 900,                 // safe budget
    reasoning: { effort: "low" },           // minimize reasoning tokens
    text: { format: { type: "text" } },     // force plain text output
  });

  const text = (resp.output_text || "").trim();
  if (!text) {
    console.warn(`[chunk ${start}-${end}] empty output_text`, JSON.stringify(resp));
    return [];
  }
  return sanitizeLines(text).slice(0, end - start + 1);
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

  try {
    const basePrompt = `
You are a concise, motivational coach generating learning plans.
Target language (BCP-47): ${languageCode}
Learner level: ${level}
Time available: ${weeklyMinutes} minutes per week
Hobby: ${hobby}

Each WEEK must be ONE LINE, with 2–3 short actionable sentences fitting the time budget.
Include a main focus and an optional bonus. Keep vocabulary simple and upbeat.

STRICT OUTPUT FORMAT:
- One line per week.
- No numbering. No bullets. No quotes. No headings. No extra commentary.
- Each line ≤ 300 characters.
`.trim();

    // Generate in chunks to avoid token limit issues
    const c1 = await genChunk(client, basePrompt, 1, 13);
    const c2 = await genChunk(client, basePrompt, 14, 26);
    const c3 = await genChunk(client, basePrompt, 27, 39);
    const c4 = await genChunk(client, basePrompt, 40, 52);

    let plan = [...c1, ...c2, ...c3, ...c4].filter(Boolean);

    // Ensure exactly 52 lines
    if (plan.length > 52) plan = plan.slice(0, 52);
    if (plan.length < 52) {
      plan = plan.concat(
        Array(52 - plan.length).fill("Practice for 20 minutes and review last week.")
      );
    }

    return res.status(200).json({ plan });
  } catch (err: any) {
    console.error("[/api/generatePlan] error:", err?.message || err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
