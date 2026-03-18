"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { exceptionsApi, ExceptionRecord } from "@/lib/api";
import Link from "next/link";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    exceptionsApi.list()
      .then((r) => setExceptions(r.data))
      .catch(() => setError("Failed to load exceptions."))
      .finally(() => setLoading(false));
  }, []);

  function expiryBadge(date?: string) {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">Expired</span>;
    if (daysLeft <= 30) return <span className="text-xs bg-orange-900 text-orange-300 px-2 py-1 rounded-full">Expires in {daysLeft}d</span>;
    return <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded-full">Expires {d.toLocaleDateString()}</span>;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Exceptions</h1>
          <Link href="/exceptions/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors">
            + New Exception
          </Link>
        </div>
        {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && exceptions.length === 0 && <p className="text-gray-500 text-sm">No exceptions yet.</p>}
        <div className="flex flex-col gap-3">
          {exceptions.map((e) => (
            <Link
              key={e.id}
              href={`/exceptions/${e.id}`}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-gray-600 transition-colors"
            >
              <div>
                <p className="font-medium text-white">{e.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{e.record_id}</p>
              </div>
              {expiryBadge(e.expiry_date)}
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
