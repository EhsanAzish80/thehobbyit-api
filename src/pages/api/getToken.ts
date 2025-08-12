// src/pages/api/getToken.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch"; // You may already have it or can use native fetch
import { signToken } from "../../lib/hmac";

const APPLE_ATTEST_VERIFY_URL = "https://apple.com/appattest/attestation/v1"; // placeholder — we'll explain below
const APP_BUNDLE_ID = process.env.APP_BUNDLE_ID!; // your iOS bundle ID

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { keyId, attestationObject, challenge } = req.body || {};
  if (!keyId || !attestationObject || !challenge) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    // 1️⃣ Send to Apple’s App Attest verification API (requires Apple’s server-side code)
    // In practice, Apple does NOT have a public HTTP API — you verify locally by:
    // - Parsing attestationObject
    // - Checking authenticatorData
    // - Verifying signature & cert chain matches Apple’s root
    //
    // For brevity here, we'll assume you have a verifyAttestation() util that does it
    const valid = await verifyAttestation({
      keyId,
      attestationObject,
      challenge,
      expectedAppId: APP_BUNDLE_ID,
    });

    if (!valid) {
      return res.status(403).json({ error: "Invalid attestation" });
    }

    // 2️⃣ If valid, sign a short-lived HMAC token for /api/generatePlan
    const token = signToken({
      aud: "generatePlan",
      exp: Math.floor(Date.now() / 1000) + 60 * 5, // 5 min expiry
    });

    res.status(200).json({ token });
  } catch (err: any) {
    console.error("getToken error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ⬇️ Example local attestation verification util (placeholder)
async function verifyAttestation({
  keyId,
  attestationObject,
  challenge,
  expectedAppId,
}: {
  keyId: string;
  attestationObject: string;
  challenge: string;
  expectedAppId: string;
}): Promise<boolean> {
  // TODO: Implement full App Attest CBOR/ASN.1 parsing & Apple cert chain validation
  // For now, return true so flow works — but in production, MUST implement real verification
  return true;
}
