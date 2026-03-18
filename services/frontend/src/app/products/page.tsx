"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { productsApi, Product } from "@/lib/api";
import Link from "next/link";

const LIFECYCLE: Record<string, { dot: string; text: string; bg: string }> = {
  operational: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-950/50 border-emerald-900/40" },
  maintenance:  { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-950/50 border-amber-900/40" },
  at_risk:      { dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-950/50 border-red-900/40" },
  build:        { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-950/50 border-blue-900/40" },
  proposed:     { dot: "bg-gray-500",    text: "text-gray-400",    bg: "bg-gray-800/50 border-gray-700/40" },
  design:       { dot: "bg-purple-400",  text: "text-purple-400",  bg: "bg-purple-950/50 border-purple-900/40" },
  approved:     { dot: "bg-teal-400",    text: "text-teal-400",    bg: "bg-teal-950/50 border-teal-900/40" },
  deployment:   { dot: "bg-indigo-400",  text: "text-indigo-400",  bg: "bg-indigo-950/50 border-indigo-900/40" },
  retiring:     { dot: "bg-orange-400",  text: "text-orange-400",  bg: "bg-orange-950/50 border-orange-900/40" },
  retired:      { dot: "bg-gray-600",    text: "text-gray-500",    bg: "bg-gray-900/50 border-gray-800/40" },
};

const HEALTH_DOT: Record<string, string> = {
  healthy: "bg-emerald-400", degraded: "bg-amber-400", at_risk: "bg-red-400", unsupported: "bg-gray-500",
};

function LifecycleBadge({ state }: { state: string }) {
  const c = LIFECYCLE[state] ?? LIFECYCLE.proposed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {state}
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    productsApi.list()
      .then((r) => setProducts(r.data))
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Products</h1>
            {!loading && <p className="text-sm text-gray-600 mt-1">{products.length} total</p>}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col gap-2">
            {[1,2,3,4].map(i => <div key={i} className="card h-16 animate-pulse" />)}
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && products.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-gray-600 text-sm">No products yet. Create a client and add environments first.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="card card-hover flex items-center gap-4 px-5 py-4 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-medium text-white">{p.name}</p>
                  <LifecycleBadge state={p.lifecycle_state} />
                </div>
                <p className="text-xs text-gray-600">
                  {p.record_id}
                  <span className="mx-1.5 text-gray-700">·</span>{p.product_type}
                  {p.vendor && <><span className="mx-1.5 text-gray-700">·</span>{p.vendor}</>}
                  {p.serial_number && <><span className="mx-1.5 text-gray-700">·</span>S/N: {p.serial_number}</>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[p.health_status] ?? "bg-gray-500"}`} />
                <span className="text-xs text-gray-600 hidden sm:block">{p.health_status}</span>
                <svg className="w-4 h-4 text-gray-700 group-hover:text-indigo-500 transition-colors ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
