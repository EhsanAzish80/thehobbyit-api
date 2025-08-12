import type { NextApiRequest, NextApiResponse } from "next";
import { signToken } from "../../lib/hmac";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { aud = "generatePlan", ttlSeconds = 120 } = (req.body ?? {}) as {
      aud?: string;
      ttlSeconds?: number;
    };

    const now = Math.floor(Date.now() / 1000);
    const ua = req.headers["user-agent"] ?? "";
    // Use first IP in x-forwarded-for if present (Vercel)
    const fwdFor = (req.headers["x-forwarded-for"] as string) || "";
    const ip = fwdFor.split(",")[0].trim() || "";

    const token = signToken({
      aud,
      exp: now + Math.min(Math.max(ttlSeconds, 30), 300), // clamp 30..300s
      ip,
      ua
    });

    return res.status(200).json({ token, exp: now + ttlSeconds });
  } catch (e: any) {
    console.error("[/api/getToken] error:", e?.message || e);
    return res.status(500).json({ error: "Token minting failed" });
  }
}
