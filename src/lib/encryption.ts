import crypto from "crypto";

// AES-256-GCM field-level encryption for sensitive columns (student PII,
// parent contact info, IEP/behavior notes - see the Prisma extension in
// prisma.ts for which fields actually get encrypted).
//
// ENCRYPTION_KEY must be a 32-byte key, base64-encoded, set in Railway's
// env vars. Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//
// IMPORTANT: losing this key means losing all encrypted data permanently.
// Keep a copy somewhere safe outside Railway (e.g. a password manager).

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM
const AUTH_TAG_LENGTH = 16;

// Prefix so we can tell an already-encrypted value apart from legacy
// plaintext during the one-time migration (and avoid double-encrypting).
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\" and add it to Railway's env vars."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to exactly 32 bytes, got ${key.length}. Regenerate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
    );
  }
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

// Encrypts a string. Passing null/undefined returns it unchanged (so
// optional fields don't need special-casing at every call site).
export function encryptValue(value: string): string;
export function encryptValue(value: string | null): string | null;
export function encryptValue(value: string | null | undefined): string | null | undefined;
export function encryptValue(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (value === "") return value; // don't bother encrypting empty strings
  if (isEncrypted(value)) return value; // already encrypted, don't double-wrap

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack iv + authTag + ciphertext together, base64-encoded, behind the prefix.
  const packed = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return PREFIX + packed;
}

// Sorts by lastName then firstName in app code. Needed anywhere those
// fields are ordered, since they're encrypted at rest - a DB-level
// `orderBy` would sort by ciphertext, not by name.
export function sortByName<T extends { firstName: string; lastName: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName);
    if (last !== 0) return last;
    return a.firstName.localeCompare(b.firstName);
  });
}

export function decryptValue(value: string): string;
export function decryptValue(value: string | null): string | null;
export function decryptValue(value: string | null | undefined): string | null | undefined;
export function decryptValue(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (!isEncrypted(value)) return value; // legacy plaintext, pass through

  const key = getKey();
  const packed = Buffer.from(value.slice(PREFIX.length), "base64");

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
