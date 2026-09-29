import type { DemoUser } from "./demo-users";
export const canModerate = (u: DemoUser | null) =>
  Boolean(u && ["moderator", "product_manager", "admin"].includes(u.role));
export const canManageRoadmap = (u: DemoUser | null) =>
  Boolean(u && ["product_manager", "admin"].includes(u.role));
export const canManageSettings = (u: DemoUser | null) => u?.role === "admin";
