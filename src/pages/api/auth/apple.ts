// src/pages/api/auth/apple.ts
export const config = { runtime: "nodejs" };

import type { NextApiRequest, NextApiResponse } from "next";
import { signToken } from "../../../lib/hmac";

async function getJose() {
  // dynamic import so TS won’t require types at build time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = await import("jose");
  return mod as any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { id_token, client_id } = req.body ?? {};
    if (!id_token || !client_id) {
      return res.status(400).json({ error: "Missing id_token or client_id" });
    }

    const { createRemoteJWKSet, jwtVerify } = await getJose();

    // Example: Apple JWKS URL (adjust for your provider if different)
    const JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

    const { payload } = await jwtVerify(id_token, JWKS, {
      audience: client_id,         // your bundle id
      issuer: "https://appleid.apple.com",
    });

    // Issue short-lived HMAC token for your backend (aud=generatePlan)
    const token = signToken({
      aud: "generatePlan",
      exp: Math.floor(Date.now() / 1000) + 60 * 5,
    });

    return res.status(200).json({ ok: true, payload, token });
  } catch (err: any) {
    console.error("[/api/auth/apple] error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
