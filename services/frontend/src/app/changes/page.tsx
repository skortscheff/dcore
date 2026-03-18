"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { changesApi, ChangeRequest } from "@/lib/api";
import Link from "next/link";

const STATUS: Record<string, { dot: string; text: string; bg: string }> = {
  draft:     { dot: "bg-gray-500",   text: "text-gray-400",   bg: "bg-gray-800/50 border-gray-700/40" },
  in_review: { dot: "bg-amber-400",  text: "text-amber-400",  bg: "bg-amber-950/50 border-amber-900/40" },
  approved:  { dot: "bg-teal-400",   text: "text-teal-400",   bg: "bg-teal-950/50 border-teal-900/40" },
  active:    { dot: "bg-emerald-400",text: "text-emerald-400",bg: "bg-emerald-950/50 border-emerald-900/40" },
  archived:  { dot: "bg-gray-600",   text: "text-gray-500",   bg: "bg-gray-900/50 border-gray-800/40" },
};

const ITIL_COLOR: Record<string, string> = {
  Emergency: "text-red-400 bg-red-950/40 border-red-900/40",
  Normal:    "text-indigo-400 bg-indigo-950/40 border-indigo-900/40",
  Standard:  "text-teal-400 bg-teal-950/40 border-teal-900/40",
};

export default function ChangesPage() {
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    changesApi.list()
      .then((r) => setChanges(r.data))
      .catch(() => setError("Failed to load changes."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Change Requests</h1>
            {!loading && <p className="text-sm text-gray-600 mt-1">{changes.length} total</p>}
          </div>
          <Link href="/changes/new" className="btn-primary">+ New Change</Link>
        </div>

        {loading && (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse" />)}
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && changes.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-gray-600 text-sm mb-4">No change requests yet.</p>
            <Link href="/changes/new" className="btn-primary inline-block">Create change request</Link>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {changes.map((c) => {
            const s = STATUS[c.status] ?? STATUS.draft;
            return (
              <Link
                key={c.id}
                href={`/changes/${c.id}`}
                className="card card-hover flex items-center gap-4 px-5 py-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium text-white truncate">{c.title}</p>
                    {c.itil_category && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${ITIL_COLOR[c.itil_category] ?? "text-gray-400 bg-gray-800/50 border-gray-700/40"}`}>
                        {c.itil_category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{c.record_id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {c.status.replace("_", " ")}
                  </span>
                  <svg className="w-4 h-4 text-gray-700 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
