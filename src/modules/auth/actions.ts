"use server";
import { redirect } from "next/navigation";
import { verifyPassword } from "./credentials";
import { clearDemoSession, setDemoSession } from "./session";
import { readDatabase } from "../../server/store";
const attempts = new Map<string, { count: number; until: number }>();
export async function loginAction(form: FormData) {
  const id = String(form.get("userId") || "");
  const password = String(form.get("password") || "");
  const key = /^[a-zA-Z0-9_-]{1,100}$/.test(id) ? id : "invalid";
  const now = Date.now();
  for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
  const bucket = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
  bucket.count++;
  if (attempts.size < 1000 || attempts.has(key)) attempts.set(key, bucket);
  else redirect("/login?error=invalid-user");
  if (
    bucket.count > 20 ||
    form.getAll("userId").length !== 1 ||
    form.getAll("password").length !== 1 ||
    !verifyPassword(id, password) ||
    !readDatabase().users.some((x) => x.id === id)
  )
    redirect("/login?error=invalid-user");
  await setDemoSession(id);
  redirect("/");
}
export async function logoutAction() {
  await clearDemoSession();
  redirect("/");
}
