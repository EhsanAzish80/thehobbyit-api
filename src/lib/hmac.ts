// src/lib/hmac.ts
// Uses dynamic import for `jose` to avoid TS/type export mismatches during build.

const secret = new TextEncoder().encode(process.env.INTERNAL_API_SECRET ?? "");

async function getJose() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = await import("jose");
  return mod as any;
}

export type BackendClaims = {
  aud: string;          // e.g., "generatePlan"
  sub: string;          // Apple user id
  deviceId?: string;    // optional device binding
  iat?: number;
  exp?: number;
  [k: string]: any;
};

export async function signToken(
  claims: Omit<BackendClaims, "iat"> & { exp?: number }
): Promise<string> {
  const { SignJWT } = await getJose();
  const now = Math.floor(Date.now() / 1000);
  const { exp, ...rest } = claims;

  return new SignJWT(rest)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(exp ?? now + 60 * 60 * 24 * 180) // default 180 days
    .sign(secret);
}

export async function verifyToken(token: string, expectedAud: string): Promise<BackendClaims> {
  const { jwtVerify } = await getJose();
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (payload.aud !== expectedAud) throw new Error("Invalid token audience");
  return payload as BackendClaims;
}
