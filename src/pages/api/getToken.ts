// src/pages/api/getToken.ts
export const config = { runtime: "nodejs" };

import type { NextApiRequest, NextApiResponse } from "next";
import { signToken } from "../../lib/hmac";
import { verifyAppAttest } from "../../lib/appAttest";

const APP_BUNDLE_ID = process.env.APP_BUNDLE_ID; // e.g. "ABCDE12345.com.your.bundle"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const debug = req.headers["x-debug"] === "1";
  const log = (...args: any[]) => debug && console.info("[getToken]", ...args);

  try {
    if (!APP_BUNDLE_ID) {
      return res.status(500).json({ error: "APP_BUNDLE_ID missing" });
    }

    // Accept both shapes: {attestationObject, challenge} or {attestationObjectB64, challengeB64}
    const body = (req.body ?? {}) as Record<string, any>;
    const keyId = body.keyId as string | undefined;

    const attestationObjectB64 =
      (body.attestationObject as string) ??
      (body.attestationObjectB64 as string);

    const challengeB64 =
      (body.challenge as string) ??
      (body.challengeB64 as string);

    log("Incoming keys:", Object.keys(body));
    log("Lengths:", {
      keyId: keyId?.length ?? 0,
      attestationObjectB64: attestationObjectB64?.length ?? 0,
      challengeB64: challengeB64?.length ?? 0,
    });

    if (!keyId || !attestationObjectB64 || !challengeB64) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Quick sanity checks (base64-ish)
    if (!/^[A-Za-z0-9+/=_-]+$/.test(attestationObjectB64) || !/^[A-Za-z0-9+/=_-]+$/.test(challengeB64)) {
      return res.status(400).json({ error: "Bad base64 inputs" });
    }

    log("Verifying App Attest…", { appId: APP_BUNDLE_ID });
    let ok = false;
    try {
      ok = await verifyAppAttest({
        attestationObjectB64,
        challengeB64,
        expectedAppId: APP_BUNDLE_ID,
      });
    } catch (e: any) {
      // Show the real reason only when X-Debug: 1 is set from the app
      const msg = e?.message || String(e);
      console.error("verifyAppAttest failed:", msg);
      return res.status(403).json({ error: debug ? `verify failed: ${msg}` : "Invalid attestation" });
    }

    if (!ok) {
      return res.status(403).json({ error: "Invalid attestation" });
    }

    // Issue short‑lived token for /api/generatePlan
    const token = signToken({
      aud: "generatePlan",
      exp: Math.floor(Date.now() / 1000) + 60 * 5, // 5 minutes
    });

    log("✅ App Attest ok, issuing token (len)", token.length);
    return res.status(200).json({ token });
  } catch (e: any) {
    console.error("getToken error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
