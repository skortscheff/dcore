"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { auditApi, AuditLog } from "@/lib/api";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-900 text-green-300",
  update: "bg-blue-900 text-blue-300",
  delete: "bg-red-900 text-red-300",
  transition: "bg-purple-900 text-purple-300",
  approve: "bg-teal-900 text-teal-300",
  reject: "bg-orange-900 text-orange-300",
  upload: "bg-indigo-900 text-indigo-300",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");

  const reload = () => {
    setLoading(true);
    auditApi.list({
      entity_type: entityType || undefined,
      actor: actor || undefined,
      action: action || undefined,
      limit: 200,
    })
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Audit Log</h1>

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          >
            <option value="">All entity types</option>
            {["product", "change", "exception", "evidence", "client", "environment", "runbook"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          >
            <option value="">All actions</option>
            {["create", "update", "delete", "transition", "approve", "reject", "upload"].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Filter by actor..."
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white w-48"
          />
          <button
            onClick={reload}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded border border-gray-700"
          >
            Apply
          </button>
        </div>

        {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}
        {!loading && logs.length === 0 && <p className="text-gray-500 text-sm">No audit entries found.</p>}

        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? "bg-gray-700 text-gray-300"}`}>
                  {log.action}
                </span>
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{log.entity_type}</span>
                <span className="text-sm text-gray-200 font-mono truncate max-w-xs">{log.entity_id}</span>
                <span className="text-xs text-gray-500 ml-auto">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>actor: <span className="text-gray-300">{log.actor}</span></span>
                {log.detail && <span>{log.detail}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
