"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { productsApi, Product } from "@/lib/api";
import Link from "next/link";

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

const HEALTH_COLORS: Record<string, string> = {
  healthy: "text-green-400",
  degraded: "text-yellow-400",
  at_risk: "text-red-400",
  unsupported: "text-gray-400",
};

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Products</h1>
        </div>
        {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && products.length === 0 && (
          <p className="text-gray-500 text-sm">No products yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-medium text-white">{p.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LIFECYCLE_COLORS[p.lifecycle_state] ?? "bg-gray-700 text-gray-300"}`}>
                    {p.lifecycle_state}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{p.record_id} · {p.product_type} · {p.vendor ?? "—"}</p>
              </div>
              <span className={`text-xs font-medium ${HEALTH_COLORS[p.health_status] ?? "text-gray-400"}`}>
                {p.health_status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
