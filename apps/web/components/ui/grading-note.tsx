"use client";

import { useState } from "react";
import { Nav } from "@/components/ui/nav";

export function GradingNote() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Show grading note"
        >
          <span aria-hidden>▼</span>
          <span>Show grading note</span>
        </button>
      </div>
    );
  }

  return (
    <header className="relative mb-6 rounded-2xl border border-border bg-card p-4 pr-12 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        aria-label="Hide grading note"
      >
        <span aria-hidden>▲</span>
      </button>

      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        EECS 4413 Silly Scripters Team Project
      </p>
      <h1 className="text-2xl font-bold text-text">Computer Accessories e-Store</h1>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        MVC + DAO backend, App Router frontend, and complete customer/admin
        flows.
      </p>
      <p className="mb-1 text-sm font-bold text-slate-600">
        For access to the admin panel, use username{" "}
        <code className="rounded bg-slate-100 px-1 font-mono text-sm">
          admin@estore.local
        </code>{" "}
        and password{" "}
        <code className="rounded bg-slate-100 px-1 font-mono text-sm">
          Admin123!
        </code>
      </p>
      <p className="mb-2 text-sm text-slate-600">
        You can use these buttons to quickly navigate to different pages for
        testing & grading, but feel free to explore the app on your own as
        well!
      </p>
      <Nav />
    </header>
  );
}
