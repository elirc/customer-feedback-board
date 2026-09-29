import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/modules/auth/session";
import { getBoardHome } from "@/modules/feedback/service";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const board = await getBoardHome(user, {
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    page: typeof params.page === "string" ? params.page : undefined,
  });

  return (
    <SiteShell user={user}>
      <section className="hero">
        <div>
          <h1 style={{ fontSize: "2.6rem", marginBottom: 12 }}>
            What should we build next?
          </h1>
          <p className="muted" style={{ maxWidth: 680, lineHeight: 1.7 }}>
            Share a useful idea, support suggestions from the community, and
            follow the product team's progress.
          </p>
          <div className="toolbar" style={{ marginTop: 18 }}>
            <Link href="/new" className="button">
              Submit an idea
            </Link>
            <Link href="/roadmap" className="button-secondary">
              View roadmap
            </Link>
          </div>
        </div>
        <div className="grid three">
          <article className="metric">
            <span className="muted">Visible posts</span>
            <h2>{board.metrics.totalPosts}</h2>
          </article>
          <article className="metric">
            <span className="muted">Planned or building</span>
            <h2>{board.metrics.plannedOrBuilding}</h2>
          </article>
          <article className="metric">
            <span className="muted">Shipped</span>
            <h2>{board.metrics.shipped}</h2>
          </article>
        </div>
      </section>

      <PageHeader
        title="Feedback board"
        description="Explore ideas and add your perspective."
      />

      <section className="grid feed">
        <article className="grid">
          <form className="card form-grid columns-2" action="/">
            <div className="field">
              <label htmlFor="q">Search</label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={typeof params.q === "string" ? params.q : ""}
                placeholder="Search ideas"
              />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                defaultValue={
                  typeof params.status === "string" ? params.status : ""
                }
              >
                <option value="">All statuses</option>
                <option value="Open">Open</option>
                <option value="Under Review">Under Review</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Shipped">Shipped</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
            <button
              className="button-secondary"
              type="submit"
              style={{ gridColumn: "1 / -1" }}
            >
              Apply filters
            </button>
          </form>

          {board.guestBlocked && (
            <p className="card">
              Guest browsing is disabled.{" "}
              <Link href="/login">Sign in to browse.</Link>
            </p>
          )}
          {!board.guestBlocked && !board.posts.length && (
            <p className="card">No ideas match these filters.</p>
          )}
          {board.posts.map((post) => (
            <article key={post.id} className="post-card">
              <div
                className="toolbar"
                style={{ justifyContent: "space-between" }}
              >
                <div className="stack">
                  <StatusBadge value={post.status} />
                  <span className="badge blue">{post.categoryName}</span>
                </div>
                <span className="muted">{post.voteCount} votes</span>
              </div>
              <div>
                <Link href={`/post/${post.slug}`}>
                  <strong style={{ fontSize: "1.1rem" }}>{post.title}</strong>
                </Link>
                <p className="muted">{post.body}</p>
              </div>
              <div
                className="toolbar"
                style={{ justifyContent: "space-between" }}
              >
                <div className="stack">
                  {post.tagNames.map((tag) => (
                    <span key={tag} className="badge blue">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="muted">
                  {post.commentCount} comments · by {post.authorName}
                </span>
              </div>
            </article>
          ))}
          <div className="toolbar">
            {board.page > 1 && (
              <Link
                className="button-secondary"
                href={
                  "/?" +
                  new URLSearchParams({
                    q: typeof params.q === "string" ? params.q : "",
                    status:
                      typeof params.status === "string" ? params.status : "",
                    page: String(board.page - 1),
                  })
                }
              >
                Previous page
              </Link>
            )}
            <span>
              Page {board.page} / {board.total} matching ideas
            </span>
            {board.page * 20 < board.total && (
              <Link
                className="button-secondary"
                href={
                  "/?" +
                  new URLSearchParams({
                    q: typeof params.q === "string" ? params.q : "",
                    status:
                      typeof params.status === "string" ? params.status : "",
                    page: String(board.page + 1),
                  })
                }
              >
                Next page
              </Link>
            )}
          </div>
        </article>

        <aside className="grid">
          <article className="card">
            <h3>Categories</h3>
            <div className="grid">
              {board.categories.map((category) => (
                <div key={category.id}>
                  <strong>{category.name}</strong>
                  <p className="muted">{category.description}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <h3>Make your feedback useful</h3>
            <p className="muted">
              Describe a concrete problem, explain who it affects, and suggest
              how success could be measured. Search first to support an existing
              idea.
            </p>
          </article>
        </aside>
      </section>
    </SiteShell>
  );
}
