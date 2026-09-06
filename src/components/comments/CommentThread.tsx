"use client";

import { useState, useMemo } from "react";
import { postComment, deleteComment } from "@/app/api/comments/actions";

type Candidate = { id: number; name: string; role: string };
type CommentRow = {
  id: number;
  body: string;
  createdAt: string;
  author: { id: number; name: string; role: string };
  isMine: boolean;
};

type Props = {
  entityType: "event" | "rfq" | "task";
  entityId: number;
  comments: CommentRow[];
  candidates: Candidate[];
};

/**
 * Render body with @[Name](id) tokens replaced by highlighted spans.
 */
function renderBody(body: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /@\[([^\]]+)\]\((\d+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(body))) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    parts.push(
      <span key={`m-${key++}`} className="bg-blue-100 text-blue-800 rounded px-1 text-xs">
        @{m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts;
}

export function CommentThread({ entityType, entityId, comments, candidates }: Props) {
  const [draft, setDraft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const trigger = useMemo(() => {
    // Show mention picker if the last token before cursor is a bare "@".
    // Very simple heuristic: last char is @, show picker.
    return draft.endsWith("@");
  }, [draft]);

  function insertMention(c: Candidate) {
    setDraft((prev) => {
      // Replace trailing '@' with @[Name](id)
      const rest = prev.replace(/@$/, "");
      return rest + `@[${c.name}](${c.id}) `;
    });
    setShowPicker(false);
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {comments.length === 0 ? (
          <li className="text-sm text-slate-400 italic">No comments yet.</li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="border-b border-slate-100 pb-3">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-medium">{c.author.name} <span className="text-xs text-slate-500">· {c.author.role}</span></div>
                <div className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{renderBody(c.body)}</div>
              {c.isMine && (
                <form action={deleteComment} className="mt-1">
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs text-red-600">Delete</button>
                </form>
              )}
            </li>
          ))
        )}
      </ul>

      <form
        action={async (fd) => {
          const body = String(fd.get("body") ?? "").trim();
          if (!body) return;
          await postComment(fd);
          setDraft("");
        }}
        className="space-y-2"
      >
        <input type="hidden" name="entityType" value={entityType} />
        <input type="hidden" name="entityId" value={entityId} />
        <div className="relative">
          <textarea
            name="body"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setShowPicker(e.target.value.endsWith("@"));
            }}
            rows={3}
            placeholder="Write a comment… type @ to mention someone"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {trigger && showPicker && candidates.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-40 w-64 overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => insertMention(c)}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-100"
                >
                  {c.name} <span className="text-slate-500">({c.role})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm">Post comment</button>
      </form>
    </div>
  );
}
