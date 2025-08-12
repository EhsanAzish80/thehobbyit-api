// src/lib/appAttest.ts
import * as cbor from "cbor";
import { sha256 } from "@noble/hashes/sha256";
// src/lib/appAttest.ts
import { X509Certificate, cryptoProvider } from "@peculiar/x509";
import { Crypto } from "@peculiar/webcrypto"; // polyfill WebCrypto in Node
import { APPLE_APP_ATTEST_ROOT_PEM } from "./appleRoots";

// Hook Node’s crypto into @peculiar/x509
setEngine("NodeCrypto", webcrypto as unknown as CryptoEngine);

// Helpers
function b64toBuf(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, "base64"));
}
function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(u8).map(b => b.toString(16).padStart(2, "0")).join("");
}
function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
function sha256Bytes(data: Uint8Array): Uint8Array {
  return Uint8Array.from(sha256(data));
}

// Parse authenticator data per WebAuthn/App Attest layout
function parseAuthData(buf: Uint8Array) {
  let off = 0;
  const rpIdHash = buf.slice(off, off + 32); off += 32;
  const flags = buf[off]; off += 1;
  const signCount = (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
  off += 4;

  // Attested credential data present (AT flag)
  const FLAG_AT = 0x40;
  const hasAT = (flags & FLAG_AT) !== 0;

  let aaguid = new Uint8Array(0);
  let credId = new Uint8Array(0);
  let cosePubKey = new Uint8Array(0);

  if (hasAT) {
    aaguid = buf.slice(off, off + 16); off += 16;
    const credIdLen = (buf[off] << 8) | buf[off + 1]; off += 2;
    credId = buf.slice(off, off + credIdLen); off += credIdLen;

    // COSE key (CBOR) – the rest must start with CBOR map
    const coseStart = buf.slice(off);
    const decoded = cbor.decodeFirstSync(coseStart) as any;
    const reencoded = cbor.encode(decoded);
    cosePubKey = new Uint8Array(reencoded);
    off += reencoded.length;
  }

  return { rpIdHash, flags, signCount, aaguid, credId, cosePubKey, raw: buf };
}

// Extract nonce OID (1.2.840.113635.100.8.2) from leaf cert
function getAppleNonceFromLeaf(leaf: X509Certificate): Uint8Array | null {
  const ext = leaf.extensions.find(e => e.oid === "1.2.840.113635.100.8.2");
  if (!ext) return null;
  // ext.value is DER OCTET STRING; peculiar/x509 returns raw DER bytes in ext.value
  // Many implementations embed the nonce directly as the ext’s value octets.
  // Depending on the encoding, you might need to strip one DER OCTET STRING header.
  // Try raw first:
  return new Uint8Array(ext.value);
}

// Validate chain up to Apple root (basic)
function validateChain(chain: X509Certificate[]): void {
  // Expect at least [leaf, intermediate, ... , rootCandidate]
  if (chain.length < 2) throw new Error("Certificate chain too short");

  // Last provided cert should be Apple’s root; if not, append our known root
  const leaf = chain[0];
  const rootCandidate = chain[chain.length - 1];

  // Add Apple root (trusted)
  const roots = [new X509Certificate(APPLE_APP_ATTEST_ROOT_PEM)];

  // Build a very simple chain check: each cert is signed by the next issuer
  for (let i = 0; i < chain.length - 1; i++) {
    const cert = chain[i];
    const issuer = chain[i + 1];
    if (!cert.verify({ publicKey: issuer.publicKey })) {
      throw new Error(`Chain verification failed at index ${i}`);
    }
  }

  // Verify last provided cert is signed by the Apple root we trust (or equals the root)
  const last = chain[chain.length - 1];
  const okWithKnownRoot =
    roots.some(root => last.verify({ publicKey: root.publicKey }) || last.raw.toString() === root.raw.toString());
  if (!okWithKnownRoot) {
    // If last wasn’t the root, we can also try verifying that the last is the root itself.
    // If neither holds, reject.
    throw new Error("Chain does not validate to Apple root");
  }

  // Optional: check EKUs, basicConstraints, etc., depending on Apple’s profile
}

// Extract ECDSA P‑256 pubkey from COSE (kty:2, alg:-7, crv:1)
function coseToRawPublicKey(cose: any): CryptoKey {
  // We’ll just reuse cert leaf’s public key to verify attStmt.sig per Apple’s doc,
  // but this shows how you could reconstruct from COSE if needed.
  throw new Error("COSE public key extraction not used here");
}

export async function verifyAppAttest({
  attestationObjectB64,
  challengeB64,
  expectedAppId,   // teamID.bundleID
}: {
  attestationObjectB64: string;
  challengeB64: string;
  expectedAppId: string;
}): Promise<boolean> {
  const attBuf = b64toBuf(attestationObjectB64);
  const att = cbor.decodeFirstSync(attBuf) as any;

  const fmt: string = att.fmt;
  const attStmt: any = att.attStmt;
  const authData: Uint8Array = new Uint8Array(att.authData);

  if (fmt !== "apple-appattest") {
    throw new Error(`Unexpected fmt: ${fmt}`);
  }

  // 1) Parse authenticator data
  const auth = parseAuthData(authData);

  // 2) Hash(clientDataJSON) – App Attest uses raw challenge bytes as clientDataJSON-equivalent
  const clientDataHash = sha256Bytes(b64toBuf(challengeB64));

  // 3) Nonce = SHA256(authData || clientDataHash)
  const nonce = sha256Bytes(concatBytes(authData, clientDataHash));

  // 4) x5c chain (leaf first)
  const x5c: Buffer[] = attStmt.x5c;
  if (!Array.isArray(x5c) || x5c.length === 0) {
    throw new Error("Missing x5c");
  }
  const chain = x5c.map((b) => new X509Certificate(Buffer.from(b)));

  // 5) Validate chain to Apple root
  validateChain(chain);

  const leaf = chain[0];

  // 6) Verify leaf has nonce extension that matches computed nonce
  const appleNonce = getAppleNonceFromLeaf(leaf);
  if (!appleNonce) throw new Error("Missing Apple nonce extension");
  if (bufToHex(appleNonce) !== bufToHex(nonce)) {
    throw new Error("Nonce mismatch");
  }

  // 7) Verify RP/app binding:
  // App Attest requires the rpIdHash in authenticatorData to equal SHA256(<teamID>.<bundleID>)
  const appIdHash = sha256Bytes(new TextEncoder().encode(expectedAppId));
  if (bufToHex(appIdHash) !== bufToHex(auth.rpIdHash)) {
    throw new Error("App ID hash mismatch");
  }

  // 8) Verify attestation signature over (authData || clientDataHash) with leaf public key
  // Apple’s attStmt uses key "sig" for ECDSA signature
  const sig: Uint8Array = attStmt.sig;
  if (!sig) throw new Error("Missing attestation signature");

  const verifyData = concatBytes(authData, clientDataHash);
  const isValidSig = await webcrypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    await leaf.publicKey.export({ format: "jwk" }).then(jwk =>
      webcrypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"])
    ),
    sig,
    verifyData
  );

  if (!isValidSig) {
    throw new Error("Invalid attestation signature");
  }

  // 9) Basic sanity checks on flags (AT must be set)
  const FLAG_AT = 0x40;
  if ((auth.flags & FLAG_AT) === 0) {
    throw new Error("AT flag not set");
  }

  // Optionally: record/associate the keyId from app for future assertions
  return true;
}
