// src/pages/api/auth/apple.ts
export const config = { runtime: "nodejs" };

import type { NextApiRequest, NextApiResponse } from "next";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { signToken } from "../../../lib/hmac";

// For native iOS apps, Apple recommends using the app’s Bundle ID as the client_id / audience.
// If you are using a Services ID, set that here instead.
const APPLE_AUDIENCE = process.env.APP_BUNDLE_ID || ""; // e.g. "thehobbyit.TheHobbyIt"
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!APPLE_AUDIENCE) return res.status(500).json({ error: "APP_BUNDLE_ID missing" });

  const debug = req.headers["x-debug"] === "1";
  const log = (...args: any[]) => debug && console.info("[/api/auth/apple]", ...args);

  try {
    const { identityToken, nonce } = (req.body ?? {}) as {
      identityToken?: string;
      nonce?: string;
    };

    if (!identityToken || typeof identityToken !== "string") {
      return res.status(400).json({ error: "Missing identityToken" });
    }

    // Verify Apple’s JWT signature and claims
    let verified: { payload: JWTPayload };
    try {
      verified = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience: APPLE_AUDIENCE, // your bundle id (or Services ID)
      });
    } catch (e: any) {
      console.error("Apple token verify failed:", e?.message || e);
      return res.status(401).json({ error: debug ? `verify failed: ${e?.message || e}` : "Invalid identityToken" });
    }

    const { sub, email, nonce_supported } = verified.payload;
    log("Verified Apple token for sub:", sub, "email:", email, "nonce_supported:", nonce_supported);

    // (Optional) If you passed a nonce when starting Sign in with Apple, verify it here.
    // if (nonce) { ... }

    // Create short-lived session for /api/generatePlan
    // You can stash sub as the user id (Apple stable user ID for your app).
    const token = signToken({
      aud: "generatePlan",
      exp: Math.floor(Date.now() / 1000) + 60 * 5, // 5 minutes
      // You can embed user info if you want to rate-limit per user
      // @ts-ignore
      sub: typeof sub === "string" ? sub : undefined,
    });

    return res.status(200).json({ token, user: { sub, email } });
  } catch (e: any) {
    console.error("/api/auth/apple error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
