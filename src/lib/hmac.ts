import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const secret = process.env.SIGNING_SECRET;
if (!secret) {
  // Don’t crash on build; throw at first use to make debugging easier.
  console.warn("WARN: SIGNING_SECRET is not set");
}

type Claims = {
  aud: string;          // audience, e.g. "generatePlan"
  exp: number;          // unix seconds
  iat: number;          // unix seconds
  nonce: string;        // random per-token
  ip?: string;          // (optional) originating IP
  ua?: string;          // (optional) user-agent
};

function b64url(data: string | Buffer) {
  // Use Node's base64url for clarity; fallback if needed:
  return Buffer.isBuffer(data)
    ? data.toString("base64url")
    : Buffer.from(data).toString("base64url");
}

function hmac(data: string) {
  if (!secret) throw new Error("SIGNING_SECRET missing");
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signToken(
  claims: Omit<Claims, "iat" | "nonce"> & Partial<Pick<Claims, "ip" | "ua">>
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: Claims = {
    ...claims,
    iat: now,
    nonce: b64url(randomBytes(16)),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64url(payloadJson);
  const sig = hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyToken(token: string, opts?: { ip?: string; ua?: string }) {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) throw new Error("Malformed token");

  const expectedSig = hmac(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Bad signature");
  }

  const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
  const claims = JSON.parse(payloadJson) as Claims;

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) throw new Error("Token expired");

  // Optional bind: if you want to pin to UA/IP (loose compare to avoid false negatives)
  if (opts?.ua && claims.ua && opts.ua.slice(0, 24) !== claims.ua.slice(0, 24)) {
    throw new Error("UA mismatch");
  }
  if (opts?.ip && claims.ip && opts.ip !== claims.ip) {
    throw new Error("IP mismatch");
  }

  return claims;
}
