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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Clients</h1>
            <p className="text-sm text-gray-600 mt-1">
              {!loading && `${clients.length} managed ${clients.length === 1 ? "client" : "clients"}`}
            </p>
          </div>
          <Link href="/clients/new" className="btn-primary">+ New Client</Link>
        </div>

        {loading && (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse" />)}
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && clients.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-gray-600 text-sm mb-4">No clients yet.</p>
            <Link href="/clients/new" className="btn-primary inline-block">Create your first client</Link>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="card card-hover flex items-center gap-4 px-5 py-4 group"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                {c.code.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{c.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {c.code}
                  {c.sla_tier && <span className="ml-2">· SLA: {c.sla_tier}</span>}
                  {c.primary_contact && <span className="ml-2 hidden sm:inline">· {c.primary_contact}</span>}
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-700 group-hover:text-indigo-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
