import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { passwordHash } from "../src/modules/auth/credentials";
import { demoUsers } from "../src/modules/auth/demo-users";
import { fictionalSeed } from "../src/server/seed";
import { initializeDatabase } from "../src/server/store";
const root = process.cwd(),
  envPath = resolve(root, ".env.local"),
  credentialPath = resolve(root, ".local-credentials.txt"),
  dbPath = resolve(root, "data/feedback-workspace.sqlite");
for (const path of [envPath, credentialPath, dbPath])
  if (existsSync(path))
    throw new Error("Setup refuses existing target: " + path);
const passwords = Object.fromEntries(
  demoUsers.map((u) => [u.id, randomBytes(20).toString("base64url")]),
);
const hashes = Object.fromEntries(
  Object.entries(passwords).map(([id, p]) => [id, passwordHash(p)]),
);
const created: string[] = [];
try {
  writeFileSync(
    envPath,
    `FEEDBACK_SESSION_SECRET=${randomBytes(48).toString("hex")}\nFEEDBACK_PASSWORD_HASHES='${JSON.stringify(hashes)}'\nFEEDBACK_COOKIE_SECURE=false\n`,
    { flag: "wx", mode: 0o600 },
  );
  created.push(envPath);
  writeFileSync(
    credentialPath,
    demoUsers
      .map(
        (u) =>
          `${u.name} (${u.role})\nUser: ${u.id}\nPassword: ${passwords[u.id]}\n`,
      )
      .join("\n"),
    { flag: "wx", mode: 0o600 },
  );
  created.push(credentialPath);
  mkdirSync(dirname(dbPath), { recursive: true });
  initializeDatabase(dbPath, fictionalSeed());
  console.log(
    "Created fictional SQLite workspace. Credentials are in .local-credentials.txt; secret values were not printed. Existing data/feedback-db.json was not imported or changed.",
  );
} catch (error) {
  for (const path of created.reverse()) unlinkSync(path);
  throw error;
}
