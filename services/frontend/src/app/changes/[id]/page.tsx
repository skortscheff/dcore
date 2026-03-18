"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { changesApi, ChangeRequest } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-700 text-gray-300",
  in_review: "bg-yellow-800 text-yellow-200",
  approved: "bg-green-800 text-green-200",
  active: "bg-blue-800 text-blue-200",
  rejected: "bg-red-800 text-red-300",
  closed: "bg-gray-800 text-gray-400",
};

export default function ChangeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [change, setChange] = useState<ChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    changesApi.get(id).then((r) => setChange(r.data)).finally(() => setLoading(false));
  }, [id]);

  const act = async (fn: () => Promise<{ data: ChangeRequest }>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      setChange(r.data);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLayout><p className="text-gray-400 text-sm animate-pulse">Loading...</p></AppLayout>;
  if (!change) return <AppLayout><p className="text-red-400 text-sm">Change request not found.</p></AppLayout>;

  const sections = [
    { label: "Description", value: change.description },
    { label: "Rationale", value: change.rationale },
    { label: "Impact", value: change.impact },
    { label: "Implementation Plan", value: change.implementation_plan },
    { label: "Validation Plan", value: change.validation_plan },
    { label: "Rollback Plan", value: change.rollback_plan },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <Link href="/changes" className="text-gray-500 text-sm hover:text-gray-300">← Changes</Link>
        <div className="flex items-center gap-3 mt-2 mb-1">
          <h1 className="text-2xl font-bold">{change.title}</h1>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[change.status] ?? "bg-gray-700 text-gray-300"}`}>
            {change.status}
          </span>
          {change.itil_category && (
            <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-1 rounded-full">{change.itil_category}</span>
          )}
        </div>
        <p className="text-gray-500 text-sm mb-4">{change.record_id}</p>

        {change.approved_by && (
          <div className="bg-green-950 border border-green-800 rounded-lg p-4 mb-5 text-sm text-green-300">
            Approved by <strong>{change.approved_by}</strong>
            {change.approved_at && ` on ${new Date(change.approved_at).toLocaleString()}`}
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {change.status === "draft" && (
            <button
              onClick={() => act(() => changesApi.submit(change.id))}
              disabled={busy}
              className="text-sm px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              Submit for Review
            </button>
          )}
          {change.status === "in_review" && (
            <>
              <button
                onClick={() => act(() => changesApi.approve(change.id))}
                disabled={busy}
                className="text-sm px-4 py-2 bg-green-800 hover:bg-green-700 text-white rounded disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => act(() => changesApi.reject(change.id))}
                disabled={busy}
                className="text-sm px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
        </div>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex flex-col gap-5">
          {sections.filter((s) => s.value).map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{s.label}</p>
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans">{s.value}</pre>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
