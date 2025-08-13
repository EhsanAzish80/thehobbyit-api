// src/pages/api/auth/refresh.ts
export const config = { runtime: "nodejs" };

import type { NextApiRequest, NextApiResponse } from "next";
import { verifyToken, signToken } from "../../../lib/hmac";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing Authorization" });

    const payload = await verifyToken(token, "generatePlan");

    const newToken = await signToken({
      aud: "generatePlan",
      sub: payload.sub,
      deviceId: payload.deviceId,
    });

    return res.status(200).json({ ok: true, token: newToken });
  } catch (err: any) {
    console.error("[/api/auth/refresh] error:", err?.message || err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
