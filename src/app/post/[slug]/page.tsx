import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { CommandForm } from "@/components/command-form";
import { PostEditor } from "@/components/post-editor";
import {
  getCurrentUser,
  canManageRoadmap,
  canModerate,
} from "@/modules/auth/session";
import { getPostDetail } from "@/modules/feedback/service";
export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser(),
    { slug } = await params,
    detail = await getPostDetail(user, slug);
  if (!detail) notFound();
  const p = detail.post,
    available = !p.hiddenAt && !p.duplicateOfPostId;
  return (
    <SiteShell user={user}>
      <header className="detail-header">
        <p className="eyebrow">COMMUNITY FEEDBACK / VERSION {p.version}</p>
        <h1>{p.title}</h1>
        <div className="toolbar">
          <StatusBadge value={p.status} />
          <span className="badge blue">{detail.categoryName}</span>
          <span>{detail.voteCount} votes</span>
        </div>
        <p className="muted">
          By {detail.authorName} / {p.visibility}
        </p>
      </header>
      {p.hiddenAt && (
        <p className="save-error">Hidden from the public board.</p>
      )}
      {detail.canonicalSlug && (
        <p className="card">
          This duplicate is retained for discussion history.{" "}
          <Link href={"/post/" + detail.canonicalSlug}>
            View the canonical idea
          </Link>
          .
        </p>
      )}
      <section className="grid two">
        <article className="card">
          <h2>The idea</h2>
          <p className="prose">{p.body}</p>
          {user && available && (
            <div className="toolbar">
              {detail.votingEnabled && (
                <CommandForm
                  compact
                  initial={{
                    action: "vote",
                    postId: p.id,
                    enabled: !detail.hasVoted,
                  }}
                  label={detail.hasVoted ? "Remove vote" : "Vote"}
                />
              )}
              <CommandForm
                compact
                initial={{
                  action: "follow",
                  postId: p.id,
                  enabled: !detail.isFollowing,
                }}
                label={detail.isFollowing ? "Unfollow" : "Follow"}
              />
              <CommandForm
                compact
                initial={{ action: "flag", postId: p.id, reason: "duplicate" }}
                label="Flag duplicate"
              />
            </div>
          )}
        </article>
        <article className="card">
          <h2>Official updates</h2>
          {!detail.officialUpdates.length && (
            <p className="muted">No team updates yet.</p>
          )}
          <Timeline
            items={detail.officialUpdates.map((x) => ({
              id: x.id,
              title: "Team update",
              body: x.body,
              createdAt: x.createdAt,
              actor: x.authorName,
            }))}
          />
        </article>
      </section>
      {user?.id === p.authorId && available && (
        <article className="card">
          <h2>Edit your idea</h2>
          <PostEditor categories={detail.categories} post={p} />
          <CommandForm
            initial={{ action: "deletePost", postId: p.id, version: p.version }}
            label="Delete unused idea"
            confirm="Delete this idea permanently? Ideas with discussion or history cannot be deleted."
          />
        </article>
      )}
      <section className="card">
        <h2>Discussion</h2>
        {p.commentsLocked && <p className="muted">Comments are locked.</p>}
        {!detail.comments.length && (
          <p className="muted">Be the first to add context.</p>
        )}
        {detail.comments.map((c) => (
          <article className="comment-card" key={c.id}>
            <strong>{c.authorName}</strong>
            <p className="prose">{c.body}</p>
            {available &&
              user?.id === c.authorId &&
              !p.commentsLocked &&
              !c.isHidden && (
                <details>
                  <summary>Edit your comment</summary>
                  <CommandForm
                    initial={{
                      action: "editComment",
                      postId: p.id,
                      commentId: c.id,
                      version: c.version,
                      body: c.body,
                    }}
                    fields={[
                      {
                        name: "body",
                        label: "Comment text",
                        type: "textarea",
                        min: 2,
                        max: 1200,
                      },
                    ]}
                    label="Save comment"
                  />
                </details>
              )}
            {available &&
              user &&
              (user.id === c.authorId || canModerate(user)) && (
                <CommandForm
                  compact
                  initial={{
                    action: "deleteComment",
                    postId: p.id,
                    commentId: c.id,
                    version: c.version,
                  }}
                  label="Delete comment"
                  confirm="Delete this comment? An audit record will remain."
                />
              )}
          </article>
        ))}
        {user && available && !p.commentsLocked && (
          <CommandForm
            initial={{ action: "comment", postId: p.id, body: "" }}
            fields={[
              {
                name: "body",
                label: "Add comment",
                type: "textarea",
                min: 2,
                max: 1200,
              },
            ]}
            label="Add comment"
          />
        )}
      </section>
      {canManageRoadmap(user) && available && (
        <section className="grid two">
          <article className="card">
            <h2>Product decisions</h2>
            <CommandForm
              initial={{
                action: "status",
                postId: p.id,
                version: p.version,
                status: p.status,
              }}
              fields={[
                {
                  name: "status",
                  label: "Status",
                  type: "select",
                  options: [
                    "Open",
                    "Under Review",
                    "Planned",
                    "In Progress",
                    "Shipped",
                    "Declined",
                  ].map((x) => ({ value: x, label: x })),
                },
              ]}
              label="Save status"
            />
            <CommandForm
              initial={{ action: "official", postId: p.id, body: "" }}
              fields={[
                {
                  name: "body",
                  label: "Official response",
                  type: "textarea",
                  min: 3,
                  max: 1200,
                },
              ]}
              label="Publish update"
            />
          </article>
          <article className="card">
            <h2>Internal notes</h2>
            <Timeline
              items={detail.internalNotes.map((x) => ({
                id: x.id,
                title: "Internal note",
                body: x.body,
                createdAt: x.createdAt,
                actor: x.authorName,
              }))}
            />
            <CommandForm
              initial={{ action: "note", postId: p.id, body: "" }}
              fields={[
                {
                  name: "body",
                  label: "Internal note",
                  type: "textarea",
                  min: 3,
                  max: 1200,
                },
              ]}
              label="Add internal note"
            />
          </article>
        </section>
      )}
      {canModerate(user) && (
        <section className="card">
          <h2>Moderation</h2>
          <CommandForm
            initial={{
              action: "moderate",
              postId: p.id,
              version: p.version,
              hidden: Boolean(p.hiddenAt),
              commentsLocked: p.commentsLocked,
            }}
            fields={[
              {
                name: "hidden",
                label: "Hide from public board",
                type: "checkbox",
              },
              {
                name: "commentsLocked",
                label: "Lock comments",
                type: "checkbox",
              },
            ]}
            label="Save moderation"
          />
          <h3>Recent staff activity</h3>
          <Timeline
            items={detail.moderationActions.map((x) => ({
              id: x.id,
              title: x.details,
              createdAt: x.createdAt,
              actor: x.actorName,
            }))}
          />
        </section>
      )}
    </SiteShell>
  );
}
