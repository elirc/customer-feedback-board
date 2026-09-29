import { SiteShell } from "@/components/site-shell";
import { CommandForm } from "@/components/command-form";
import { requireRole } from "@/modules/auth/session";
import { getFeedbackDatabase } from "@/modules/feedback/repository";
export default async function SettingsPage() {
  const user = await requireRole(["admin"]),
    { settings: s } = await getFeedbackDatabase();
  return (
    <SiteShell user={user}>
      <header>
        <h1>Portal settings</h1>
        <p className="muted">
          Public mode prevents new internal ideas. Existing internal discussions
          remain restricted to staff.
        </p>
      </header>
      <article className="card">
        <CommandForm
          initial={{
            action: "settings",
            version: s.version,
            allowGuestBrowsing: s.allowGuestBrowsing,
            allowVoting: s.allowVoting,
            portalMode: s.portalMode,
          }}
          fields={[
            {
              name: "allowGuestBrowsing",
              label: "Allow guest browsing",
              type: "checkbox",
            },
            { name: "allowVoting", label: "Allow voting", type: "checkbox" },
            {
              name: "portalMode",
              label: "Portal mode",
              type: "select",
              options: [
                { value: "public", label: "Public ideas only" },
                { value: "mixed", label: "Public and internal ideas" },
              ],
            },
          ]}
          label="Save settings"
        />
      </article>
    </SiteShell>
  );
}
