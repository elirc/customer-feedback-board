import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DemoUser, FeedbackRole } from "./demo-users";
import { signSession, verifySession } from "./credentials";
import { readDatabase } from "../../server/store";
export { canModerate, canManageRoadmap, canManageSettings } from "./policy";
const COOKIE = "feedback_session";
export async function getCurrentUser(): Promise<DemoUser | null> {
  const id = verifySession((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  const user = readDatabase().users.find((x) => x.id === id);
  return user ? { ...user, email: "" } : null;
}
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
export async function requireRole(roles: FeedbackRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
export async function setDemoSession(userId: string) {
  (await cookies()).set(COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.FEEDBACK_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 1800,
  });
}
export async function clearDemoSession() {
  (await cookies()).delete(COOKIE);
  (await cookies()).delete("feedback_demo_user");
}
