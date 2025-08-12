// src/pages/api/getToken.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { signToken } from "../../lib/hmac";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Optional: add auth so only your iOS app can request tokens
  const appSecret = req.headers["x-app-secret"];
  if (appSecret !== process.env.APP_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const token = signToken({
    aud: "generatePlan",
    exp: Math.floor(Date.now() / 1000) + 60, // valid for 60s
    ip: ((req.headers["x-forwarded-for"] as string) || "").split(",")[0].trim(),
    ua: req.headers["user-agent"] as string,
  });

  res.status(200).json({ token });
}
