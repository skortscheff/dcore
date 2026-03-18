"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { exceptionsApi, ExceptionRecord } from "@/lib/api";
import Link from "next/link";

function ExpiryBadge({ date }: { date?: string }) {
  if (!date) return null;
  const daysLeft = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0)
    return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-red-950/50 border-red-900/40 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Expired</span>;
  if (daysLeft <= 30)
    return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-amber-950/50 border-amber-900/40 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{daysLeft}d left</span>;
  return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-gray-800/50 border-gray-700/40 text-gray-500"><span className="w-1.5 h-1.5 rounded-full bg-gray-600" />{daysLeft}d left</span>;
}

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

  const expired = exceptions.filter(e => e.is_expired).length;
  const expiringSoon = exceptions.filter(e => !e.is_expired && e.days_until_expiry != null && e.days_until_expiry <= 30).length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Exceptions</h1>
            {!loading && (
              <p className="text-sm text-gray-600 mt-1">
                {exceptions.length} total
                {expired > 0 && <span className="ml-2 text-red-500">{expired} expired</span>}
                {expiringSoon > 0 && <span className="ml-2 text-amber-500">{expiringSoon} expiring soon</span>}
              </p>
            )}
          </div>
          <Link href="/exceptions/new" className="btn-primary">+ New Exception</Link>
        </div>

        {loading && (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse" />)}
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && exceptions.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-gray-600 text-sm mb-4">No exceptions recorded.</p>
            <Link href="/exceptions/new" className="btn-primary inline-block">Record exception</Link>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {exceptions.map((e) => (
            <Link
              key={e.id}
              href={`/exceptions/${e.id}`}
              className="card card-hover flex items-center gap-4 px-5 py-4 group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{e.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {e.record_id}
                  {e.cobit_control && <span className="ml-2">· {e.cobit_control}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ExpiryBadge date={e.expiry_date} />
                <svg className="w-4 h-4 text-gray-700 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
