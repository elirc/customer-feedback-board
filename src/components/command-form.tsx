"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { saveFeedback } from "@/modules/feedback/actions";
let writePending = false;
const subscribers = new Set<() => void>();
const subscribe = (listener: () => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};
function setWritePending(value: boolean) {
  writePending = value;
  for (const listener of subscribers) listener();
}
export type Field = {
  name: string;
  label: string;
  type?: "textarea" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  max?: number;
  min?: number;
};
export function CommandForm({
  initial,
  fields = [],
  label,
  confirm,
  compact = false,
}: {
  initial: Record<string, string | number | boolean>;
  fields?: Field[];
  label: string;
  confirm?: string;
  compact?: boolean;
}) {
  const [values, setValues] = useState(initial),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(
      null,
    );
  const lock = useRef(false),
    mounted = useRef(true);
  const router = useRouter(),
    prefix = useId();
  const anyBusy = useSyncExternalStore(
    subscribe,
    () => writePending,
    () => false,
  );
  const fingerprint = JSON.stringify(initial);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty && !lock.current) setValues(JSON.parse(fingerprint));
  }, [fingerprint, dirty]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const a = (e.target as HTMLElement).closest("a[href]");
      if (
        a &&
        !window.confirm(
          "Leave this page and discard unsaved work? Export your draft first if needed.",
        )
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, busy]);
  function exportDraft() {
    const blob = new Blob(
      [JSON.stringify({ kind: "feedback-draft", values }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "feedback-draft.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <form
      className={compact ? "command-inline" : "form-grid command-form"}
      data-dirty={dirty || busy ? "true" : "false"}
      aria-label={label}
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current || writePending) return;
        if (confirm && !window.confirm(confirm)) return;
        lock.current = true;
        setWritePending(true);
        setBusy(true);
        setFeedback(null);
        try {
          const result = await saveFeedback(
            fields.length === 0 ? initial : values,
          );
          if (!mounted.current) return;
          setFeedback(result);
          if (result.ok) {
            setDirty(false);
            if (["comment", "note", "official"].includes(String(values.action)))
              setValues((v) => ({ ...v, body: "" }));
            if (result.redirect) router.push(result.redirect);
            router.refresh();
          }
        } catch {
          if (mounted.current)
            setFeedback({
              ok: false,
              message:
                "The response was lost. Keep this draft and review current records before retrying a create.",
            });
        } finally {
          lock.current = false;
          setWritePending(false);
          if (mounted.current) setBusy(false);
        }
      }}
    >
      <fieldset disabled={anyBusy}>
        {fields.map((field) => {
          const id = prefix + field.name;
          return (
            <div className="field" key={field.name}>
              <label htmlFor={id}>{field.label}</label>
              {field.type === "checkbox" ? (
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => {
                    setValues((v) => ({
                      ...v,
                      [field.name]: e.target.checked,
                    }));
                    setDirty(true);
                  }}
                />
              ) : field.type === "select" ? (
                <select
                  id={id}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [field.name]: e.target.value }));
                    setDirty(true);
                  }}
                >
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={id}
                  rows={4}
                  minLength={field.min}
                  maxLength={field.max}
                  required
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [field.name]: e.target.value }));
                    setDirty(true);
                  }}
                />
              ) : (
                <input
                  id={id}
                  minLength={field.min}
                  maxLength={field.max}
                  required
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [field.name]: e.target.value }));
                    setDirty(true);
                  }}
                />
              )}
            </div>
          );
        })}
        <div className="toolbar">
          <button
            className={confirm ? "button-danger" : "button-secondary"}
            type="submit"
          >
            {busy ? "Saving..." : label}
          </button>
          {fields.length > 0 && (
            <>
              <button
                className="button-secondary"
                type="button"
                onClick={exportDraft}
              >
                Export draft
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reload current records? Unsaved drafts on this page will be discarded.",
                    )
                  ) {
                    setDirty(false);
                    window.location.reload();
                  }
                }}
              >
                Load current
              </button>
            </>
          )}
        </div>
      </fieldset>
      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={feedback.ok ? "save-success" : "save-error"}
        >
          {feedback.message}
        </p>
      )}
      {dirty && (
        <p className="muted">
          Unsaved draft
          {typeof values.version === "number"
            ? ` based on version ${values.version}`
            : ""}
          .
        </p>
      )}
    </form>
  );
}
