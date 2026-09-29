import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
const hashesSchema = z.record(z.string().regex(/^[0-9a-f]{32}:[0-9a-f]{128}$/));
function secret() {
  const value = process.env.FEEDBACK_SESSION_SECRET;
  if (!value || value.length < 48)
    throw new Error("Generated FEEDBACK_SESSION_SECRET is required");
  return value;
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(userId: string, password: string) {
  const hashes = hashesSchema.parse(
    JSON.parse(process.env.FEEDBACK_PASSWORD_HASHES || "{}"),
  );
  const stored =
    hashes[userId] || "00000000000000000000000000000000:" + "00".repeat(64);
  const [salt, expected] = stored.split(":");
  const candidate = scryptSync(
    password.length <= 200 ? password : "invalid",
    salt,
    64,
  );
  return Boolean(
    hashes[userId] &&
      password.length >= 12 &&
      password.length <= 200 &&
      timingSafeEqual(candidate, Buffer.from(expected, "hex")),
  );
}
export function signSession(userId: string, at = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(at / 1000) + 1800,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret()).update(payload).digest("base64url")
  );
}
export function verifySession(
  value: string | undefined,
  at = Date.now(),
): string | null {
  if (!value || value.length > 1000) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const expected = createHmac("sha256", secret()).update(parts[0]).digest();
  const signature = Buffer.from(parts[1], "base64url");
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(signature, expected)
  )
    return null;
  try {
    const data = z
      .object({
        sub: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
        exp: z.number().int(),
        nonce: z.string().regex(/^[0-9a-f]{32}$/),
      })
      .strict()
      .parse(JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")));
    const seconds = Math.floor(at / 1000);
    return data.exp > seconds && data.exp <= seconds + 1800 ? data.sub : null;
  } catch {
    return null;
  }
}
