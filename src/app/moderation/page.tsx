import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { CommandForm } from "@/components/command-form";
import { MergeForm } from "@/components/merge-form";
import { requireRole } from "@/modules/auth/session";
import { getModerationCenter } from "@/modules/feedback/service";
export default async function ModerationPage() {
  const user = await requireRole(["moderator", "product_manager", "admin"]),
    data = await getModerationCenter(user);
  return (
    <SiteShell user={user}>
      <header>
        <h1>Moderation center</h1>
        <p className="muted">
          Review reports, preserve discussion history, and keep a clear
          canonical idea.
        </p>
      </header>
      <section className="grid two">
        <article className="card">
          <h2>Open flags</h2>
          {!data.flags.length && <p className="muted">No open reports.</p>}
          {data.flags.map((f) => (
            <article className="comment-card" key={f.id}>
              <strong>{f.postTitle}</strong>
              <p>
                {f.reason} / {f.createdByName}
              </p>
              <CommandForm
                compact
                initial={{ action: "resolveFlag", flagId: f.id }}
                label="Resolve flag"
              />
            </article>
          ))}
        </article>
        <article className="card">
          <h2>Merge duplicates</h2>
          <p className="muted">
            Choose two active ideas with matching visibility. Votes and follows
            are deduplicated; comments stay on the source.
          </p>
          <MergeForm
            posts={data.posts.filter(
              (p) => !p.hiddenAt && !p.duplicateOfPostId,
            )}
          />
        </article>
      </section>
      <article className="card">
        <h2>All ideas</h2>
        {data.posts.map((p) => (
          <p key={p.id}>
            <Link href={"/post/" + p.slug}>{p.title}</Link> / {p.status}
            {p.hiddenAt ? " / hidden" : ""}
          </p>
        ))}
      </article>
    </SiteShell>
  );
}
