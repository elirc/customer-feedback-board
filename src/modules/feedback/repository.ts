import { readDatabase, transact } from "../../server/store";
import type { FeedbackDatabase } from "./types";
export async function getFeedbackDatabase() {
  return readDatabase();
}
export function transaction<T>(work: (db: FeedbackDatabase) => T): T {
  return transact(work);
}
