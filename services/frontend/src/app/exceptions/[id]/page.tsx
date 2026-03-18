"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { exceptionsApi, ExceptionRecord } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ExceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [exc, setExc] = useState<ExceptionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    exceptionsApi.get(id).then((r) => setExc(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppLayout><p className="text-gray-400 text-sm animate-pulse">Loading...</p></AppLayout>;
  if (!exc) return <AppLayout><p className="text-red-400 text-sm">Exception not found.</p></AppLayout>;

  const sections = [
    { label: "Reason for Deviation", value: exc.reason },
    { label: "Risk Introduced", value: exc.risk_introduced },
    { label: "Compensating Controls", value: exc.compensating_controls },
  ];

  const expiryAlert = () => {
    if (!exc.expiry_date) return null;
    if (exc.is_expired)
      return (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-5 text-sm text-red-300">
          This exception expired on {new Date(exc.expiry_date).toLocaleDateString()}. Immediate review required.
        </div>
      );
    if (exc.days_until_expiry != null && exc.days_until_expiry <= 30)
      return (
        <div className="bg-yellow-950 border border-yellow-800 rounded-lg p-4 mb-5 text-sm text-yellow-300">
          Expiring in <strong>{exc.days_until_expiry} days</strong> — {new Date(exc.expiry_date).toLocaleDateString()}
        </div>
      );
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-5 text-sm text-gray-400">
        Expires {new Date(exc.expiry_date).toLocaleDateString()} ({exc.days_until_expiry} days remaining)
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <Link href="/exceptions" className="text-gray-500 text-sm hover:text-gray-300">← Exceptions</Link>
        <div className="flex items-center gap-3 mt-2 mb-1">
          <h1 className="text-2xl font-bold">{exc.title}</h1>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{exc.status}</span>
          {exc.cobit_control && (
            <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-1 rounded-full">{exc.cobit_control}</span>
          )}
        </div>
        <p className="text-gray-500 text-sm mb-4">{exc.record_id}</p>

        {expiryAlert()}

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
