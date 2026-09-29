import Link from "next/link";
import { demoUsers } from "@/modules/auth/demo-users";
import { loginAction } from "@/modules/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = params.error === "invalid-user";

  return (
    <div className="page-container">
      <section className="hero">
        <div>
          <h1>Sign in to the feedback board</h1>
          <p className="muted">
            Use a generated local account and its password from
            .local-credentials.txt.
          </p>
          <p className="muted">
            Guests can still browse the public board, but voting, commenting,
            and internal workflows require a session.
          </p>
          <Link href="/" className="button-secondary">
            Continue as guest
          </Link>
        </div>

        <div className="card">
          <h2>Local sign-in</h2>
          {error ? (
            <p style={{ color: "var(--danger)" }}>
              Sign-in failed or too many attempts. Check your local credentials.
            </p>
          ) : null}
          <form action={loginAction} className="form-grid">
            <div className="field">
              <label htmlFor="userId">Demo identity</label>
              <select id="userId" name="userId" defaultValue={demoUsers[0]?.id}>
                {demoUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.role.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="current-password"
              />
            </div>
            <button className="button" type="submit">
              Start session
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
