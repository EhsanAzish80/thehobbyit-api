// src/lib/appAttest.ts
import * as cbor from "cbor";
import { sha256 } from "@noble/hashes/sha256";
import { X509Certificate, cryptoProvider } from "@peculiar/x509";
import { APPLE_APP_ATTEST_ROOT_PEM } from "./appleRoots";

// --- WebCrypto wiring (prefer native, fallback to @peculiar/webcrypto) ---
let subtle: SubtleCrypto;
(function initCryptoProvider() {
  const nativeCrypto = (globalThis as any)?.crypto;
  if (nativeCrypto?.subtle && typeof nativeCrypto.subtle.importKey === "function") {
    cryptoProvider.set(nativeCrypto);
    subtle = nativeCrypto.subtle;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Crypto } = require("@peculiar/webcrypto");
    const nodeCrypto = new Crypto();
    cryptoProvider.set(nodeCrypto);
    subtle = nodeCrypto.subtle;
  }
})();

// ---------- Helpers ----------
function b64toBuf(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
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

// Parse authenticator data (WebAuthn/App Attest layout)
function parseAuthData(buf: Uint8Array) {
  if (buf.length < 37) throw new Error("authData too short");
  let off = 0;
  const rpIdHash = buf.slice(off, off + 32); off += 32;
  const flags = buf[off]; off += 1;
  const signCount = (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
  off += 4;

  const FLAG_AT = 0x40;
  const hasAT = (flags & FLAG_AT) !== 0;

  let aaguid = new Uint8Array(0);
  let credId = new Uint8Array(0);
  let cosePubKey = new Uint8Array(0);

  if (hasAT) {
    if (buf.length < off + 18) throw new Error("authData AT region too short");
    aaguid = buf.slice(off, off + 16); off += 16;
    const credIdLen = (buf[off] << 8) | buf[off + 1]; off += 2;
    if (buf.length < off + credIdLen) throw new Error("credId out of range");
    credId = buf.slice(off, off + credIdLen); off += credIdLen;

    const remainder = buf.slice(off);
    const decoded = cbor.decodeFirstSync(remainder) as unknown;
    const reencoded = cbor.encode(decoded);
    cosePubKey = new Uint8Array(reencoded);
    off += reencoded.length;
  }

  return { rpIdHash, flags, signCount, aaguid, credId, cosePubKey, raw: buf };
}

// Apple nonce extension may be OCTETSTRING wrapping another OCTETSTRING.
function unwrapOctetString(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 2 || bytes[0] !== 0x04) return bytes;
  let len = bytes[1];
  let offset = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (bytes.length < 2 + n) return bytes;
    len = 0;
    for (let i = 0; i < n; i++) len = (len << 8) | bytes[2 + i];
    offset = 2 + n;
  }
  const inner = bytes.slice(offset, offset + len);
  if (inner[0] === 0x04) return unwrapOctetString(inner);
  return inner;
}

function getAppleNonceFromLeaf(leaf: X509Certificate): Uint8Array | null {
  const ext = leaf.extensions.find((e) => (e as any).type === "1.2.840.113635.100.8.2");
  if (!ext) return null;
  const raw = new Uint8Array((ext as any).value as ArrayBuffer);
  return unwrapOctetString(raw);
}

function validateChain(chain: X509Certificate[]): void {
  if (chain.length < 2) throw new Error("Certificate chain too short");
  const appleRoot = new X509Certificate(APPLE_APP_ATTEST_ROOT_PEM);

  for (let i = 0; i < chain.length - 1; i++) {
    const cert = chain[i];
    const issuer = chain[i + 1];
    if (!cert.verify({ publicKey: issuer.publicKey })) {
      throw new Error(`Chain verification failed at index ${i}`);
    }
  }

  const last = chain[chain.length - 1];
  const ok =
    last.verify({ publicKey: appleRoot.publicKey }) ||
    bufToHex(new Uint8Array(last.rawData)) === bufToHex(new Uint8Array(appleRoot.rawData));

  if (!ok) throw new Error("Chain does not validate to Apple root");
}

// DER → raw (r||s) conversion for ECDSA signatures
function derToJoseSignature(der: Uint8Array, size = 32): Uint8Array {
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error("Invalid DER");
  offset++; // skip length
  if (der[offset++] !== 0x02) throw new Error("Invalid DER");
  let rLen = der[offset++];
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  if (der[offset++] !== 0x02) throw new Error("Invalid DER");
  let sLen = der[offset++];
  let s = der.slice(offset, offset + sLen);

  if (r.length > size) r = r.slice(r.length - size);
  if (s.length > size) s = s.slice(s.length - size);
  if (r.length < size) r = Uint8Array.from([...new Uint8Array(size - r.length), ...r]);
  if (s.length < size) s = Uint8Array.from([...new Uint8Array(size - s.length), ...s]);

  return Uint8Array.from([...r, ...s]);
}

export async function verifyAppAttest({
  attestationObjectB64,
  challengeB64,
  expectedAppId,
}: {
  attestationObjectB64: string;
  challengeB64: string;
  expectedAppId: string;
}): Promise<boolean> {
  const attBuf = b64toBuf(attestationObjectB64);
  const att = cbor.decodeFirstSync(attBuf) as any;

  if (att.fmt !== "apple-appattest") {
    throw new Error(`Unexpected fmt: ${att.fmt}`);
  }

  const authData = new Uint8Array(att.authData);
  const auth = parseAuthData(authData);
  const clientDataHash = sha256Bytes(b64toBuf(challengeB64));
  const nonce = sha256Bytes(concatBytes(authData, clientDataHash));

  const x5c: Buffer[] = att.attStmt.x5c;
  if (!Array.isArray(x5c) || x5c.length === 0) throw new Error("Missing x5c");
  const chain = x5c.map((b) => new X509Certificate(Buffer.from(b)));

  validateChain(chain);
  const leaf = chain[0];

  const appleNonce = getAppleNonceFromLeaf(leaf);
  if (!appleNonce) throw new Error("Missing Apple nonce extension");
  if (bufToHex(appleNonce) !== bufToHex(nonce)) throw new Error("Nonce mismatch");

  const appIdHash = sha256Bytes(new TextEncoder().encode(expectedAppId));
  if (bufToHex(appIdHash) !== bufToHex(auth.rpIdHash)) {
    throw new Error("App ID hash mismatch");
  }

  const sigDer: Uint8Array = att.attStmt.sig;
  if (!sigDer) throw new Error("Missing attestation signature");
  const sigRaw = derToJoseSignature(sigDer);

  const verifyData = concatBytes(authData, clientDataHash);

  const jwk = await subtle.exportKey("jwk", leaf.publicKey as CryptoKey);
  const key = await subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );

  const ok = await subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    sigRaw,
    verifyData
  );
  if (!ok) throw new Error("Invalid attestation signature");

  if ((auth.flags & 0x40) === 0) throw new Error("AT flag not set");

  return true;
}
