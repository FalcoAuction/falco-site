"use client"

import { useState, useTransition } from "react"
import type { TodoItem } from "@/lib/today-data"

export function TodoEditor({ initial }: { initial: TodoItem[] }) {
  const [items, setItems] = useState<TodoItem[]>(initial)
  const [draft, setDraft] = useState("")
  const [pending, startTransition] = useTransition()

  function addTodo() {
    const content = draft.trim()
    if (!content) return
    startTransition(async () => {
      const res = await fetch("/api/admin/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const json = await res.json()
        setItems((prev) => [
          {
            id: json.todo.id,
            content: json.todo.content,
            priority: json.todo.priority ?? 0,
            createdAt: json.todo.created_at,
            completedAt: json.todo.completed_at,
            context: json.todo.context,
          },
          ...prev,
        ])
        setDraft("")
      }
    })
  }

  function toggle(id: string, isComplete: boolean) {
    startTransition(async () => {
      const res = await fetch("/api/admin/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, complete: !isComplete, uncomplete: isComplete }),
      })
      if (res.ok) {
        setItems((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, completedAt: isComplete ? null : new Date().toISOString() }
              : t
          )
        )
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/todos?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }
    })
  }

  const active = items.filter((t) => !t.completedAt)
  const recentlyDone = items.filter((t) => t.completedAt)

  return (
    <div className="px-4 py-3">
      {/* Add box */}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTodo()
          }}
          placeholder="Add task… (Enter to save)"
          disabled={pending}
          className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-blue-400/60 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addTodo}
          disabled={pending || !draft.trim()}
          className="rounded-lg border border-blue-400/40 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-sm text-blue-100 font-semibold transition-colors"
        >
          Add
        </button>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <ul className="mt-3 space-y-1">
          {active.map((t) => (
            <li
              key={t.id}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() => toggle(t.id, false)}
                className="h-4 w-4 rounded border border-white/30 hover:border-emerald-400 transition-colors shrink-0"
                aria-label="Mark done"
              />
              <span className="flex-1 text-sm text-white/90">{t.content}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-xs transition-all"
                aria-label="Delete"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {active.length === 0 && (
        <div className="mt-4 text-sm text-white/40 italic">
          Nothing on your list. Type one above to add.
        </div>
      )}

      {/* Recently done */}
      {recentlyDone.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-white/40 hover:text-white/60 select-none">
            Recently completed ({recentlyDone.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {recentlyDone.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => toggle(t.id, true)}
                  className="h-4 w-4 rounded border border-emerald-400/60 bg-emerald-400/30 shrink-0"
                  aria-label="Mark undone"
                />
                <span className="flex-1 text-sm text-white/40 line-through">{t.content}</span>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 text-xs transition-all"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
