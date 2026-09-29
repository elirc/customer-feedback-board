import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/modules/auth/session";
import { getBoardHome } from "@/modules/feedback/service";
export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser(),
    params = await searchParams,
    status = ["Planned", "In Progress", "Shipped"].includes(
      String(params.status),
    )
      ? String(params.status)
      : "Planned";
  const board = await getBoardHome(user, {
    status,
    page: typeof params.page === "string" ? params.page : undefined,
  });
  return (
    <SiteShell user={user}>
      <header>
        <h1>Product roadmap</h1>
        <p className="muted">
          Follow ideas from a plan to a shipped improvement.
        </p>
        <nav className="toolbar">
          {["Planned", "In Progress", "Shipped"].map((s) => (
            <Link
              key={s}
              className="button-secondary"
              href={"/roadmap?" + new URLSearchParams({ status: s })}
            >
              {s}
            </Link>
          ))}
        </nav>
      </header>
      {!board.posts.length && (
        <p className="card">
          {board.guestBlocked
            ? "Sign in to view the roadmap."
            : "No visible ideas in this stage yet."}
        </p>
      )}
      <div className="grid three">
        {board.posts.map((p) => (
          <article className="card" key={p.id}>
            <StatusBadge value={p.status} />
            <h2>
              <Link href={"/post/" + p.slug}>{p.title}</Link>
            </h2>
            <p>{p.body}</p>
          </article>
        ))}
      </div>
      <nav className="toolbar">
        {board.page > 1 && (
          <Link
            href={
              "/roadmap?" +
              new URLSearchParams({ status, page: String(board.page - 1) })
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
            href={
              "/roadmap?" +
              new URLSearchParams({ status, page: String(board.page + 1) })
            }
          >
            Next page
          </Link>
        )}
      </nav>
    </SiteShell>
  );
}
