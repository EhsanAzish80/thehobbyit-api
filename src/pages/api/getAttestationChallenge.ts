// src/pages/api/getAttestationChallenge.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const challenge = randomBytes(32); // 256-bit
  const challengeB64 = challenge.toString("base64");

  // Optional: store challenge in memory or DB to prevent reuse
  // e.g., using Redis or a temp in-memory store keyed by request
  // For now, we just return it to the client
  res.status(200).json({ challenge: challengeB64 });
}
