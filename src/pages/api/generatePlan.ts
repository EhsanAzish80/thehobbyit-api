// src/pages/api/generatePlan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { verifyToken } from "../../lib/hmac";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- Auth: require our short‑lived server token ---
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

  // --- Validate inputs ---
  if (!process.env.OPENAI_API_KEY)
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  if (typeof hobby !== "string" || hobby.trim().length === 0 || hobby.length > 80)
    return res.status(400).json({ error: "Invalid hobby" });

  const normalizedLevel =
    typeof level === "string"
      ? level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
      : "";

  if (!["Beginner", "Intermediate", "Advanced"].includes(normalizedLevel))
    return res.status(400).json({ error: "Invalid level" });

  const weeklyMinutes = Number(minutes);
  if (!Number.isFinite(weeklyMinutes) || weeklyMinutes < 15 || weeklyMinutes > 600)
    return res.status(400).json({ error: "Invalid minutes" });

  if (typeof languageCode !== "string" || !/^[A-Za-z-]{2,8}$/.test(languageCode))
    return res.status(400).json({ error: "Invalid languageCode" });

  // --- Prompt (kept simple; structure enforced by schema) ---
  const system = `
You are a concise, motivational coach. Return exactly 52 concise, unique weekly lines
for a progressive plan for the given hobby, level, and weekly minutes.
One line per week, 2–3 short sentences, no headings, no numbering, no quotes, no bullets.
Each line ≤ 300 characters. Do not include the word "Week".
`.trim();

  const user = `
Language: ${languageCode}
Level: ${normalizedLevel}
Minutes per week: ${weeklyMinutes}
Hobby: ${hobby}
`.trim();

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "WeeklyPlan52",
          schema: {
            type: "array",
            items: { type: "string", minLength: 4, maxLength: 300 },
            minItems: 52,
            maxItems: 52,
          },
          strict: true,
        },
      },
      max_output_tokens: 1400,
    });

    const raw = (response as any)?.output_text ?? "";
    let weeks: string[];

    try {
      weeks = JSON.parse(raw);
      if (!Array.isArray(weeks) || weeks.length !== 52)
        throw new Error("Schema not satisfied");
    } catch {
      // Safety net: if provider changes shape unexpectedly
      return res.status(502).json({ error: "Provider format error", rawText: raw });
    }

    // Prefix here for display consistency
    const plan = weeks.map((line, i) => `Week ${i + 1}: ${String(line || "").trim()}`);

    return res.status(200).json({ plan, rawText: raw });
  } catch (err: any) {
    console.error("[/api/generatePlan] error:", err?.message || err);
    return res.status(500).json({ error: "Provider error" });
  }
}
