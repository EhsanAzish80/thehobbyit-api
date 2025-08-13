// src/lib/hmac.ts
import { SignJWT, jwtVerify, JWTPayload } from "jose";

const secret = new TextEncoder().encode(process.env.INTERNAL_API_SECRET);

export type BackendClaims = JWTPayload & {
  aud: string;           // e.g., "generatePlan"
  sub: string;           // Apple user id (stable per Apple account)
  deviceId?: string;     // optional device identifier from client
};

export async function signToken(
  claims: Omit<BackendClaims, "iat"> & { exp?: number }
): Promise<string> {
  const { exp, ...rest } = claims;
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT(rest as BackendClaims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(exp ?? now + 60 * 60 * 24 * 180) // default 180 days
    .sign(secret);

  return jwt;
}

export async function verifyToken(token: string, expectedAud: string) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });
  if (payload.aud !== expectedAud) {
    throw new Error("Invalid token audience");
  }
  return payload as BackendClaims;
}
