import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { existsSync, openSync, closeSync, unlinkSync } from "node:fs";
import { validateDatabase } from "../modules/feedback/database-schema";
import type { FeedbackDatabase } from "../modules/feedback/types";
import { BoardError } from "../modules/feedback/errors";
export const MAX_BYTES = 16 * 1024 * 1024;
export function databasePath() {
  return resolve(
    process.env.FEEDBACK_DATABASE_PATH || "data/feedback-workspace.sqlite",
  );
}
function open() {
  const path = databasePath();
  if (!existsSync(path))
    throw new BoardError(
      503,
      "Local database is not initialized. Run npm run setup:local.",
    );
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;");
  return db;
}
function decode(raw: unknown) {
  if (typeof raw !== "string" || Buffer.byteLength(raw) > MAX_BYTES)
    throw new BoardError(503, "Database content exceeds the supported limit.");
  return validateDatabase(JSON.parse(raw));
}
export function readDatabase(): FeedbackDatabase {
  const db = open();
  try {
    const row = db.prepare("SELECT document FROM workspace WHERE id=1").get();
    return decode(row?.document);
  } finally {
    db.close();
  }
}
export function transact<T>(change: (current: FeedbackDatabase) => T): T {
  const db = open();
  try {
    db.exec("BEGIN IMMEDIATE");
    const row = db.prepare("SELECT document FROM workspace WHERE id=1").get();
    const current = decode(row?.document);
    const result = change(current);
    if (result instanceof Promise)
      throw new Error("Transactions must be synchronous");
    if (current.revision >= 2147483646)
      throw new BoardError(409, "Database revision exhausted.");
    current.revision++;
    validateDatabase(current);
    const encoded = JSON.stringify(current);
    if (Buffer.byteLength(encoded) > MAX_BYTES)
      throw new BoardError(
        409,
        "Local database capacity reached. Export and archive before adding more data.",
      );
    db.prepare("UPDATE workspace SET document=? WHERE id=1").run(encoded);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    db.close();
  }
}
export function initializeDatabase(path: string, initial: FeedbackDatabase) {
  if (existsSync(path))
    throw new Error("Refusing to overwrite an existing database");
  const value = JSON.stringify(validateDatabase(initial));
  if (Buffer.byteLength(value) > MAX_BYTES)
    throw new Error("Initial database too large");
  const fd = openSync(path, "wx", 0o600);
  closeSync(fd);
  const db = new DatabaseSync(path);
  try {
    db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE workspace(id INTEGER PRIMARY KEY CHECK(id=1),document TEXT NOT NULL CHECK(json_valid(document)));",
    );
    db.prepare("INSERT INTO workspace VALUES(1,?)").run(value);
  } finally {
    db.close();
  }
}
