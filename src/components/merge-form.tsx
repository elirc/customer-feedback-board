"use client";
import { useState } from "react";
import type { FeedbackPost } from "@/modules/feedback/types";
import { CommandForm } from "./command-form";
export function MergeForm({ posts }: { posts: FeedbackPost[] }) {
  const [source, setSource] = useState(""),
    [target, setTarget] = useState("");
  const a = posts.find((p) => p.id === source),
    b = posts.find((p) => p.id === target);
  return (
    <div className="form-grid">
      <div className="field">
        <label htmlFor="merge-source">Source duplicate</label>
        <select
          id="merge-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">Choose a source</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} / v{p.version}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="merge-target">Canonical idea</label>
        <select
          id="merge-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">Choose a target</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} / v{p.version}
            </option>
          ))}
        </select>
      </div>
      {a && b && (
        <CommandForm
          key={a.id + ":" + b.id}
          initial={{
            action: "merge",
            sourcePostId: a.id,
            targetPostId: b.id,
            sourceVersion: a.version,
            targetVersion: b.version,
          }}
          label="Merge duplicate"
          confirm="Merge this duplicate? Votes and followers move to the canonical idea; original discussion stays read-only. This action has no undo."
        />
      )}
    </div>
  );
}
