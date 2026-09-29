import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/modules/auth/session";
import { getDashboardData } from "@/modules/feedback/service";

export default async function DashboardPage() {
  const user = await requireRole(["moderator", "product_manager", "admin"]);
  const data = await getDashboardData(user);

  return (
    <SiteShell user={user}>
      <PageHeader
        title="Product feedback analytics"
        description="This dashboard is intentionally operational: trend signals, status mix, and recent moderation matter more than vanity charts."
      />
      <div className="grid three">
        <article className="metric">
          <span className="muted">Top voted posts</span>
          <h2>{data.topPosts.length}</h2>
        </article>
        <article className="metric">
          <span className="muted">Open flags</span>
          <h2>{data.openFlags}</h2>
        </article>
        <article className="metric">
          <span className="muted">Tracked statuses</span>
          <h2>{data.postsByStatus.length}</h2>
        </article>
      </div>

      <section className="grid two">
        <article className="card">
          <h3>Posts by status</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.postsByStatus.map((entry) => (
                  <tr key={entry.status}>
                    <td>
                      <StatusBadge value={entry.status} />
                    </td>
                    <td>{entry.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="card">
          <h3>Recent moderation actions</h3>
          <div className="timeline">
            {data.recentModeration.map((item) => (
              <div key={item.id} className="timeline-item">
                <strong>{item.details}</strong>
                <span className="muted">{item.actorName}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </SiteShell>
  );
}
