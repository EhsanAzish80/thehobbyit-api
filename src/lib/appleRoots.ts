// src/lib/appleRoots.ts
// Apple WebAuthn/App Attest root CA PEMs (public). Keep updated when Apple rotates.
// These PEMs are examples; confirm them against Apple’s docs/cert website before use.
export const APPLE_WEBAUTHN_ROOT_PEM = `-----BEGIN CERTIFICATE-----
MIID... (Apple WebAuthn Root CA - G3)
-----END CERTIFICATE-----`;

export const APPLE_APP_ATTEST_ROOT_PEM = `-----BEGIN CERTIFICATE-----
MIID... (Apple App Attest Root CA / Apple Root CA - G3)
-----END CERTIFICATE-----`;
