import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { initializeDatabase } from "../src/server/store";
import { fictionalSeed } from "../src/server/seed";
import { passwordHash } from "../src/modules/auth/credentials";
import { demoUsers } from "../src/modules/auth/demo-users";
async function main() {
  const root = mkdtempSync(join(tmpdir(), "astra-feedback-verify-")),
    results = resolve(
      process.env.FEEDBACK_VERIFY_RESULTS_DIR || ".verification",
    );
  mkdirSync(results, { recursive: true });
  const env = {
    ...process.env,
    FEEDBACK_DATABASE_PATH: join(root, "fixture.sqlite"),
    FEEDBACK_SESSION_SECRET: randomBytes(48).toString("hex"),
    FEEDBACK_PASSWORD_HASHES: JSON.stringify(
      Object.fromEntries(
        demoUsers.map((u) => [
          u.id,
          passwordHash("Fictional-browser-password-123"),
        ]),
      ),
    ),
    FEEDBACK_TEST_OWNED: "astra-feedback-verify",
    FEEDBACK_COOKIE_SECURE: "false",
    NEXT_TELEMETRY_DISABLED: "1",
    FEEDBACK_BROWSER_REPORT: join(results, "browser.json"),
  };
  initializeDatabase(env.FEEDBACK_DATABASE_PATH, fictionalSeed());
  async function step(name: string, args: string[]) {
    console.log("START " + name);
    let output = "";
    await new Promise<void>((ok, fail) => {
      const child = spawn(process.execPath, args, {
        env,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (x) => {
        output += x;
      });
      child.stderr.on("data", (x) => {
        output += x;
      });
      child.on("error", fail);
      child.on("exit", (code) => {
        writeFileSync(join(results, name + ".log"), output);
        if (code === 0) {
          console.log("PASS " + name);
          ok();
        } else {
          console.error(output.slice(-10000));
          fail(new Error(name + " failed"));
        }
      });
    });
    return output;
  }
  try {
    const mode = process.argv[2] || "verify";
    let count = 0;
    if (mode !== "browser") {
      const output = await step("backend-tests", [
        "node_modules/tsx/dist/cli.mjs",
        "--test",
        "tests/workflow.test.ts",
      ]);
      count = Number(output.match(/# pass (\d+)/)?.[1] || 0);
      await step("typecheck", ["node_modules/typescript/bin/tsc", "--noEmit"]);
      await step("build", [
        "node_modules/next/dist/bin/next",
        "build",
        "--webpack",
      ]);
    }
    await step("browser-tests", [
      "node_modules/@playwright/test/cli.js",
      "test",
    ]);
    const browser = JSON.parse(
      readFileSync(join(results, "browser.json"), "utf8"),
    );
    if (
      browser.stats.unexpected ||
      browser.stats.flaky ||
      browser.stats.skipped
    )
      throw new Error("Browser suite was not entirely passing");
    writeFileSync(
      join(results, "results.json"),
      JSON.stringify(
        {
          passed: true,
          mode,
          backendTests: count,
          browserTests: browser.stats.expected,
          total: count + browser.stats.expected,
          build: mode !== "browser",
          database: "Helper-owned temporary SQLite aggregate",
        },
        null,
        2,
      ),
    );
  } finally {
    if (!root.startsWith(join(tmpdir(), "astra-feedback-verify-")))
      throw new Error("Unexpected cleanup target");
    rmSync(root, { recursive: true, force: true });
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
