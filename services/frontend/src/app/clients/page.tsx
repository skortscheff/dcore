"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { clientsApi, Client } from "@/lib/api";
import Link from "next/link";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    clientsApi.list()
      .then((r) => setClients(r.data))
      .catch(() => setError("Failed to load clients."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Link
            href="/clients/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
          >
            + New Client
          </Link>
        </div>
        {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && clients.length === 0 && (
          <p className="text-gray-500 text-sm">No clients yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-gray-600 transition-colors"
            >
              <div>
                <p className="font-medium text-white">{c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.code} {c.sla_tier ? `· SLA: ${c.sla_tier}` : ""}</p>
              </div>
              <span className="text-gray-600 text-sm">→</span>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
