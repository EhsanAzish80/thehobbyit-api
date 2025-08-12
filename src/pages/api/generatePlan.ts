// src/pages/api/generatePlan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { verifyToken } from "../../lib/hmac";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      Array(52 - lines.length).fill("Practice for 20 minutes and review last week.")
    );
  }

  return lines;
}

function pickOutputText(resp: any): string {
  // Prefer the unified helper when available
  if (typeof resp?.output_text === "string" && resp.output_text.length > 0) {
    return resp.output_text;
  }
  // Fallbacks for different SDK shapes
  const text0 = resp?.output?.[0]?.content?.[0]?.text;
  if (typeof text0 === "string" && text0.length > 0) return text0;

  const choice = resp?.choices?.[0]?.message?.content;
  if (typeof choice === "string" && choice.length > 0) return choice;

  return "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Require short-lived HMAC token ---
  const token = (req.headers["x-client-token"] as string) || "";
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const claims = verifyToken(token, {
      ua: req.headers["user-agent"] as string,
      ip: ((req.headers["x-forwarded-for"] as string) || "").split(",")[0].trim(),
    });
    if (claims.aud !== "generatePlan") {
      return res.status(403).json({ error: "Invalid audience" });
    }
  } catch (e: any) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

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
- Do NOT include the text "Week" in the output — the system will add it.
`.trim();

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt,
      // temperature: 0.7, // sometimes unsupported on specific snapshots; omit to be safe
      max_output_tokens: 1600, // a bit higher to avoid truncation
      // You can also set: reasoning: { effort: "low" },
      // and: text: { format: { type: "text" } },
    });

    const text = pickOutputText(response);
    if (!text) {
      // If incomplete due to token cap, you’ll see it here:
      console.warn("Model returned empty text or hit token limit:", JSON.stringify(response?.incomplete_details ?? {}, null, 2));
    }

    let plan = sanitizeLines(text);
    // Add "Week X:" prefix on our side
    plan = plan.map((line, i) => `Week ${i + 1}: ${line}`);

    return res.status(200).json({ plan });
  } catch (err: any) {
    console.error("[/api/generatePlan] error:", err?.message || err);
    return res.status(500).json({ error: "Provider error" });
  }
}
