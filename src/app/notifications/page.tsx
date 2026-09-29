import { CommandForm } from "@/components/command-form";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { getNotifications } from "@/modules/feedback/service";
import { formatDateTime } from "@/modules/shared/format";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const notifications = await getNotifications(user);

  return (
    <SiteShell user={user}>
      <PageHeader
        title="Notifications"
        description="We start with in-app notifications only so the business model of follows and updates is clear before external delivery is added."
      />
      <div className="grid">
        {notifications.map((notification) => (
          <article key={notification.id} className="card">
            <strong>{notification.title}</strong>
            <p>{notification.body}</p>
            <span className="muted">
              {formatDateTime(notification.createdAt)} /{" "}
              {notification.isRead ? "Read" : "Unread"}
            </span>
            {!notification.isRead && (
              <CommandForm
                compact
                initial={{
                  action: "readNotification",
                  notificationId: notification.id,
                }}
                label="Mark read"
              />
            )}
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
