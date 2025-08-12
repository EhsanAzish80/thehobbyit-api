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
      Array(52 - lines.length).fill(
        "Focused practice. Review last week and add a small stretch goal."
      )
    );
  }
  return lines;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require our server-issued token
  const authz =
    req.headers.authorization || (req.headers["x-client-token"] as string | undefined);
  const token = authz?.startsWith("Bearer ") ? authz.slice(7) : authz;

  try {
    if (!token) return res.status(401).json({ error: "Missing token" });
    const claims = verifyToken(token);
    if (claims.aud !== "generatePlan") return res.status(403).json({ error: "Bad audience" });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { hobby, level, minutes, languageCode } = req.body ?? {};

  // Normalize level to expected enum casing
  const normalizedLevel =
    typeof level === "string"
      ? (level as string).charAt(0).toUpperCase() + (level as string).slice(1).toLowerCase()
      : "";

  // Input validation
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

  // Prompt (system + user guidance) to reduce repetition and enforce JSON array
  const system =
    `You are a concise, motivational coach. Produce practical weekly plans that fit the time budget. ` +
    `Avoid filler, avoid repeating the same sentence across many weeks. Vary focus areas naturally.`;

  const user =
    `Target language (BCP-47): ${languageCode}\n` +
    `Learner level: ${normalizedLevel}\n` +
    `Time available: ${weeklyMinutes} minutes per week\n` +
    `Hobby: ${hobby}\n\n` +
    `Create a progressive 52-week plan.\n` +
    `Each WEEK must be ONE SHORT LINE (2–3 actionable sentences; ≤300 chars). Use varied, concrete tasks. ` +
    `Do not include headings or numbering. No quotes. No bullets. Avoid repeating identical closing lines.\n\n` +
    `RETURN FORMAT:\n` +
    `Return ONLY a JSON array of EXACTLY 52 strings (no extra text, no code fences).`;

  try {
    // Single text input for the Responses API (works across SDK versions)
    const inputText = `${system}\n\n---\n${user}`;

    const resp = await client.responses.create({
      model: "gpt-5-mini",
      input: inputText,
      temperature: 0.3,
      max_output_tokens: 1400,
    });

    // Extract raw text safely (covers SDK shape differences)
    const rawText =
      (resp as any)?.output_text ??
      (resp as any)?.content?.[0]?.text ??
      (resp as any)?.output?.[0]?.content?.[0]?.text ??
      (resp as any)?.choices?.[0]?.message?.content ??
      "";

    // Try to parse a JSON array from the text
    const extractJsonArray = (s: string): string[] => {
      const start = s.indexOf("[");
      const end = s.lastIndexOf("]");
      if (start === -1 || end === -1 || end <= start) return [];
      try {
        const parsed = JSON.parse(s.slice(start, end + 1));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    let plan: string[] = extractJsonArray(rawText);

    // Fallback to sanitizer if the model didn't return clean JSON
    if (plan.length !== 52) {
      plan = sanitizeLines(rawText);
    }

    // Ensure exactly 52 lines
    if (plan.length > 52) plan = plan.slice(0, 52);
    if (plan.length < 52) {
      plan = plan.concat(
        Array(52 - plan.length).fill(
          "Focused practice. Review last week and add a small, varied stretch goal."
        )
      );
    }

    // Prefix with "Week N: "
    const prefixed = plan.map((line, i) => `Week ${i + 1}: ${line}`);

    return res.status(200).json({ plan: prefixed, rawText });
  } catch (err: any) {
    console.error("[/api/generatePlan] error:", err?.message || err);
    return res.status(500).json({ error: "Provider error" });
  }
}
