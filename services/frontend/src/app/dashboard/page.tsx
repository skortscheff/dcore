"use client";

import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { useEffect, useState } from "react";

interface DashboardData {
  counts: Record<string, number>;
  health_breakdown: Record<string, number>;
  lifecycle_breakdown: Record<string, number>;
  exceptions_expiring_soon: number;
  exceptions_expired: number;
  storage: { objects: number; bytes: number };
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: "text-green-400",
  degraded: "text-yellow-400",
  at_risk: "text-red-400",
  unsupported: "text-gray-400",
};

const LIFECYCLE_COLORS: Record<string, string> = {
  operational: "bg-green-800 text-green-200",
  maintenance: "bg-yellow-800 text-yellow-200",
  at_risk: "bg-red-800 text-red-200",
  build: "bg-blue-800 text-blue-200",
  proposed: "bg-gray-700 text-gray-300",
  design: "bg-purple-800 text-purple-200",
  approved: "bg-teal-800 text-teal-200",
  deployment: "bg-indigo-800 text-indigo-200",
  retiring: "bg-orange-800 text-orange-200",
  retired: "bg-gray-800 text-gray-400",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<DashboardData>("/dashboard/")
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout><p className="text-gray-400 text-sm animate-pulse">Loading...</p></AppLayout>;
  if (error || !data) return <AppLayout><p className="text-red-400 text-sm">{error || "No data"}</p></AppLayout>;

  const countItems = [
    { label: "Clients", key: "clients" },
    { label: "Environments", key: "environments" },
    { label: "Products", key: "products" },
    { label: "Runbooks", key: "runbooks" },
    { label: "Changes", key: "changes" },
    { label: "Exceptions", key: "exceptions" },
    { label: "Evidence", key: "evidence" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {/* Counts */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {countItems.map(({ label, key }) => (
            <div key={key} className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-3xl font-bold text-white">{data.counts[key] ?? 0}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Health breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Product Health</h2>
            <div className="flex flex-col gap-3">
              {Object.entries(data.health_breakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`text-sm font-medium capitalize ${HEALTH_COLORS[status] ?? "text-gray-400"}`}>
                    {status.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${HEALTH_COLORS[status]?.replace("text-", "bg-") ?? "bg-gray-500"}`}
                        style={{ width: `${Math.round((count / (data.counts.products || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lifecycle breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Product Lifecycle</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.lifecycle_breakdown).map(([state, count]) => (
                <span key={state} className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${LIFECYCLE_COLORS[state] ?? "bg-gray-700 text-gray-300"}`}>
                  {state.replace("_", " ")}
                  <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Exception status */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Exception Status</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-400">Expired</span>
                <span className={`text-2xl font-bold ${data.exceptions_expired > 0 ? "text-red-400" : "text-gray-400"}`}>
                  {data.exceptions_expired}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-400">Expiring within 30 days</span>
                <span className={`text-2xl font-bold ${data.exceptions_expiring_soon > 0 ? "text-yellow-400" : "text-gray-400"}`}>
                  {data.exceptions_expiring_soon}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total exceptions</span>
                <span className="text-2xl font-bold text-gray-300">{data.counts.exceptions}</span>
              </div>
            </div>
          </div>

          {/* Storage stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Evidence Storage</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Files stored</span>
                <span className="text-2xl font-bold text-white">{data.storage.objects}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total size</span>
                <span className="text-2xl font-bold text-white">{formatBytes(data.storage.bytes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Evidence records</span>
                <span className="text-lg font-semibold text-gray-300">{data.counts.evidence}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
