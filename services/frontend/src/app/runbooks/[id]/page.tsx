"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { runbooksApi, Runbook } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function RunbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [runbook, setRunbook] = useState<Runbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    runbooksApi.get(id).then((r) => setRunbook(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppLayout><p className="text-gray-400 text-sm animate-pulse">Loading...</p></AppLayout>;
  if (!runbook) return <AppLayout><p className="text-red-400 text-sm">Runbook not found.</p></AppLayout>;

  const sections = [
    { label: "Trigger", value: runbook.trigger },
    { label: "Pre-checks", value: runbook.pre_checks },
    { label: "Steps", value: runbook.steps },
    { label: "Validation", value: runbook.validation },
    { label: "Rollback", value: runbook.rollback },
    { label: "Escalation", value: runbook.escalation },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <Link href="/runbooks" className="text-gray-500 text-sm hover:text-gray-300">← Runbooks</Link>
        <div className="flex items-center gap-3 mt-2 mb-6">
          <h1 className="text-2xl font-bold">{runbook.title}</h1>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{runbook.status}</span>
        </div>
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
