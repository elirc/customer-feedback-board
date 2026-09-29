import { SiteShell } from "@/components/site-shell";
import { PostEditor } from "@/components/post-editor";
import { requireUser, canModerate } from "@/modules/auth/session";
import { getFeedbackDatabase } from "@/modules/feedback/repository";
export default async function NewPostPage() {
  const user = await requireUser();
  const db = await getFeedbackDatabase();
  return (
    <SiteShell user={user}>
      <header>
        <p className="eyebrow">A BETTER EVERYDAY PRODUCT</p>
        <h1>Share an idea</h1>
        <p className="muted">
          Describe the problem and who would benefit. You can edit an idea
          later; its visibility stays fixed.
        </p>
      </header>
      <article className="card">
        <PostEditor
          categories={db.categories}
          staff={canModerate(user) && db.settings.portalMode === "mixed"}
        />
      </article>
    </SiteShell>
  );
}
