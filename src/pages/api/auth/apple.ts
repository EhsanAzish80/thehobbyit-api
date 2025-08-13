// src/pages/api/auth/apple.ts
export const config = { runtime: "nodejs" };

import type { NextApiRequest, NextApiResponse } from "next";
import { signToken } from "../../../lib/hmac";

async function getJose() {
  // dynamic import to avoid type issues at build time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = await import("jose");
  return mod as any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { id_token, client_id, deviceId } = req.body ?? {};
    if (typeof id_token !== "string" || typeof client_id !== "string") {
      return res.status(400).json({ error: "Missing or invalid id_token/client_id" });
    }

    const { createRemoteJWKSet, jwtVerify } = await getJose();
    const JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

    const { payload } = await jwtVerify(id_token, JWKS, {
      audience: process.env.APPLE_AUDIENCE ?? client_id, // optionally lock to .env
      issuer: "https://appleid.apple.com",
    });

    // Apple stable user id
    const appleSub = String(payload.sub || "");
    if (!appleSub) return res.status(400).json({ error: "Invalid Apple token (no sub)" });

    // Issue a long-lived backend token (bind to device if provided)
    const token = await signToken({
      aud: "generatePlan",
      sub: appleSub,
      deviceId: typeof deviceId === "string" ? deviceId : undefined,
      // exp omitted → defaults to 180 days (see signToken)
    });

    return res.status(200).json({ ok: true, token });
  } catch (err: any) {
    console.error("[/api/auth/apple] error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
