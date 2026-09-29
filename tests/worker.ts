import { executeCommand } from "../src/modules/feedback/service";
import { demoUsers } from "../src/modules/auth/demo-users";
async function main() {
  for (let i = 0; i < 10; i++)
    await executeCommand(demoUsers[0], {
      action: "vote",
      postId: "post-keyboard",
      enabled: true,
    });
}
main().catch(() => {
  process.exitCode = 1;
});
