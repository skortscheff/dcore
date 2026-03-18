"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { runbooksApi, Runbook } from "@/lib/api";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-700 text-gray-300",
  in_review: "bg-yellow-800 text-yellow-200",
  approved: "bg-teal-800 text-teal-200",
  active: "bg-green-800 text-green-200",
  archived: "bg-gray-800 text-gray-400",
};

export default function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    runbooksApi.list()
      .then((r) => setRunbooks(r.data))
      .catch(() => setError("Failed to load runbooks."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Runbooks</h1>
          <Link href="/runbooks/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors">
            + New Runbook
          </Link>
        </div>
        {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && runbooks.length === 0 && <p className="text-gray-500 text-sm">No runbooks yet.</p>}
        <div className="flex flex-col gap-3">
          {runbooks.map((r) => (
            <Link
              key={r.id}
              href={`/runbooks/${r.id}`}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-gray-600 transition-colors"
            >
              <p className="font-medium text-white">{r.title}</p>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[r.status] ?? "bg-gray-700 text-gray-300"}`}>
                {r.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
