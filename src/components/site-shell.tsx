"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/modules/auth/actions";
import type { DemoUser } from "@/modules/auth/demo-users";

const navItems = [
  { href: "/", label: "Board" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/new", label: "Submit idea" },
  { href: "/dashboard", label: "Analytics" },
  { href: "/moderation", label: "Moderation" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
];

export function SiteShell({
  user,
  children,
}: {
  user: DemoUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="stack">
            <div>
              <strong style={{ display: "block" }}>
                Customer Feedback Board
              </strong>
              <span className="muted">
                Public roadmap communication with moderation and internal
                workflow support.
              </span>
            </div>
          </div>

          <nav className="site-nav">
            {navItems
              .filter(
                (item) =>
                  !["/dashboard", "/moderation"].includes(item.href) ||
                  Boolean(user && user.role !== "customer"),
              )
              .filter(
                (item) => item.href !== "/settings" || user?.role === "admin",
              )
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={pathname === item.href ? "true" : "false"}
                >
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="toolbar">
            {user ? (
              <>
                <span className="badge green">
                  {user.name} · {user.role.replace("_", " ")}
                </span>
                <form
                  action={logoutAction}
                  onSubmit={(e) => {
                    if (
                      document.querySelector('[data-dirty="true"]') &&
                      !window.confirm(
                        "Sign out and discard unsaved drafts? Export them first if needed.",
                      )
                    )
                      e.preventDefault();
                  }}
                >
                  <button className="button-secondary" type="submit">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="button-secondary">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="page-container">{children}</main>
    </div>
  );
}
