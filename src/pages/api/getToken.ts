// src/pages/api/getToken.ts
// at the top of any pages/api/*.ts that imports appAttest.ts
export const config = { runtime: "nodejs" };
import type { NextApiRequest, NextApiResponse } from "next";
import { signToken } from "../../lib/hmac";
import { verifyAppAttest } from "../../lib/appAttest";

const APP_BUNDLE_ID = process.env.APP_BUNDLE_ID!; // e.g., "ABCDE12345.com.your.bundle"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { keyId, attestationObject, challenge } = req.body || {};
    if (!keyId || !attestationObject || !challenge) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (!APP_BUNDLE_ID) {
      return res.status(500).json({ error: "APP_BUNDLE_ID missing" });
    }

    // Verify App Attest attestation
    const ok = await verifyAppAttest({
      attestationObjectB64: attestationObject,
      challengeB64: challenge,
      expectedAppId: APP_BUNDLE_ID, // TEAMID.BUNDLEID
    });
    if (!ok) return res.status(403).json({ error: "Invalid attestation" });

    // Issue short-lived HMAC access token for your protected endpoint
    const token = signToken({
      aud: "generatePlan",
      exp: Math.floor(Date.now() / 1000) + 60 * 5, // 5 minutes
    });

    res.status(200).json({ token });
  } catch (e: any) {
    console.error("getToken error:", e?.message || e);
    res.status(500).json({ error: "Server error" });
  }
}
