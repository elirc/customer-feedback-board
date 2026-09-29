import { formatDateTime } from "@/modules/shared/format";

export function Timeline({
  items,
}: {
  items: {
    id: string;
    title: string;
    body?: string;
    createdAt: string;
    actor?: string;
  }[];
}) {
  return (
    <div className="timeline">
      {items.length === 0 ? (
        <p className="muted">No timeline entries yet.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="timeline-item">
            <strong>{item.title}</strong>
            {item.body ? <p>{item.body}</p> : null}
            <span className="muted">
              {item.actor ? `${item.actor} · ` : ""}
              {formatDateTime(item.createdAt)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
