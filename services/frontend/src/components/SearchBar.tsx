"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

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
    <div ref={ref} className="relative w-full max-w-sm">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          className="w-full bg-[#0d1221] border border-[#1a2035] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-indigo-600/60 focus:ring-1 focus:ring-indigo-600/20 transition-colors"
          placeholder="Search clients, products…"
          value={query}
          onChange={handleChange}
          onFocus={() => hasResults && setOpen(true)}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </span>
        )}
      </div>

      {open && results && (
        <div className="absolute top-full mt-2 w-full min-w-[280px] bg-[#0d1221] border border-[#1a2035] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {!hasResults ? (
            <p className="text-gray-600 text-sm px-4 py-3">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            <>
              {results.clients.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-700 uppercase tracking-widest px-4 pt-3 pb-1.5 font-medium">Clients</p>
                  {results.clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { router.push(`/clients/${c.id}`); setOpen(false); setQuery(""); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#111827] transition-colors"
                    >
                      <p className="text-sm text-white font-medium">{c.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{c.code}</p>
                    </button>
                  ))}
                </div>
              )}
              {results.products.length > 0 && (
                <div className={results.clients.length > 0 ? "border-t border-[#1a2035]" : ""}>
                  <p className="text-[10px] text-gray-700 uppercase tracking-widest px-4 pt-3 pb-1.5 font-medium">Products</p>
                  {results.products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { router.push(`/products/${p.id}`); setOpen(false); setQuery(""); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#111827] transition-colors"
                    >
                      <p className="text-sm text-white font-medium">{p.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{p.record_id} · {p.product_type} · {p.lifecycle_state}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
