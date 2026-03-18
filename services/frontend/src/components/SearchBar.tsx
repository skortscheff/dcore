"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clsx } from "clsx";

interface SearchResults {
  clients: Array<{ id: string; name: string; code: string }>;
  products: Array<{ id: string; name: string; record_id: string; product_type: string; lifecycle_state: string }>;
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounce.current) clearTimeout(debounce.current);
    if (!val.trim()) { setResults(null); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<SearchResults>("/search", { params: { q: val } });
        setResults(res.data);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  const hasResults = results && (results.clients.length > 0 || results.products.length > 0);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <input
        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search clients, products..."
        value={query}
        onChange={handleChange}
        onFocus={() => hasResults && setOpen(true)}
      />
      {loading && (
        <span className="absolute right-3 top-2 text-gray-500 text-xs animate-pulse">...</span>
      )}
      {open && results && (
        <div className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {!hasResults && (
            <p className="text-gray-500 text-sm px-4 py-3">No results for "{query}"</p>
          )}
          {results.clients.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide px-4 pt-3 pb-1">Clients</p>
              {results.clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { router.push(`/clients/${c.id}`); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-colors"
                >
                  <p className="text-sm text-white">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.code}</p>
                </button>
              ))}
            </div>
          )}
          {results.products.length > 0 && (
            <div className={clsx(results.clients.length > 0 && "border-t border-gray-800")}>
              <p className="text-xs text-gray-500 uppercase tracking-wide px-4 pt-3 pb-1">Products</p>
              {results.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { router.push(`/products/${p.id}`); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-colors"
                >
                  <p className="text-sm text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.record_id} · {p.product_type} · {p.lifecycle_state}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
