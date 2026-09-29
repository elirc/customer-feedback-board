"use server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getCurrentUser } from "../auth/session";
import { executeCommand } from "./service";
import { BoardError } from "./errors";
export type ActionResult = { ok: boolean; message: string; redirect?: string };
export async function saveFeedback(raw: unknown): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user)
      return {
        ok: false,
        message: "Session expired. Export your draft before signing in again.",
      };
    const result = await executeCommand(user, raw);
    // The write is already committed. Cache refresh failure must not invite another create.
    try {
      revalidatePath("/", "layout");
    } catch {
      return {
        ok: true,
        ...result,
        message:
          result.message +
          " Refresh failed; reload to see the accepted change.",
      };
    }
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof ZodError)
      return {
        ok: false,
        message: error.issues
          .map((x) => x.path.join(".") + ": " + x.message)
          .join("; ")
          .slice(0, 800),
      };
    if (error instanceof BoardError)
      return { ok: false, message: error.message };
    return {
      ok: false,
      message:
        "The save could not be confirmed. Your draft is still available. Review current records before retrying a create.",
    };
  }
}
