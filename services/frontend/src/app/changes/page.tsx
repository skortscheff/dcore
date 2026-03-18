"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { changesApi, ChangeRequest } from "@/lib/api";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-700 text-gray-300",
  in_review: "bg-yellow-800 text-yellow-200",
  approved: "bg-teal-800 text-teal-200",
  active: "bg-green-800 text-green-200",
  archived: "bg-gray-800 text-gray-400",
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Change Requests</h1>
          <Link href="/changes/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors">
            + New Change Request
          </Link>
        </div>
        {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && changes.length === 0 && <p className="text-gray-500 text-sm">No change requests yet.</p>}
        <div className="flex flex-col gap-3">
          {changes.map((c) => (
            <Link
              key={c.id}
              href={`/changes/${c.id}`}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-gray-600 transition-colors"
            >
              <div>
                <p className="font-medium text-white">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.record_id}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-700 text-gray-300"}`}>
                {c.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
