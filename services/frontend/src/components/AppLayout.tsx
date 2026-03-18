"use client";

import Sidebar from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ReactNode, useRef, useState } from "react";
import { useTheme, PRESETS } from "@/context/ThemeContext";

function HeaderControls() {
  const { accent, setAccent, lang, setLang } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 shrink-0">

      {/* Language toggle */}
      <div className="flex items-center rounded-lg overflow-hidden border border-[#1a2035] text-xs">
        <button
          onClick={() => setLang("en")}
          className={`px-2.5 py-1.5 transition-colors ${
            lang === "en"
              ? "text-white font-medium"
              : "text-gray-600 hover:text-gray-400"
          }`}
          style={lang === "en" ? { backgroundColor: "var(--accent-bg)", color: "var(--accent-light)" } : {}}
        >
          EN
        </button>
        <div className="w-px h-4 bg-[#1a2035]" />
        <button
          onClick={() => setLang("es")}
          className={`px-2.5 py-1.5 transition-colors ${
            lang === "es"
              ? "text-white font-medium"
              : "text-gray-600 hover:text-gray-400"
          }`}
          style={lang === "es" ? { backgroundColor: "var(--accent-bg)", color: "var(--accent-light)" } : {}}
        >
          ES
        </button>
      </div>

      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="w-7 h-7 rounded-full border-2 border-[#1a2035] hover:border-[#2d3555] transition-colors shadow-lg shrink-0"
          style={{ backgroundColor: accent }}
          aria-label="Accent color"
          title="Change accent color"
        />

        {pickerOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />

            {/* Popover */}
            <div className="absolute right-0 top-9 z-50 bg-[#0d1221] border border-[#1a2035] rounded-xl p-3 shadow-2xl shadow-black/60 w-48">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2.5 px-0.5">Accent colour</p>

              {/* Preset swatches */}
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {PRESETS.map((p) => (
                  <button
                    key={p.color}
                    onClick={() => { setAccent(p.color); setPickerOpen(false); }}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: p.color,
                      boxShadow: accent === p.color ? `0 0 0 2px #0d1221, 0 0 0 3.5px ${p.color}` : undefined,
                    }}
                    aria-label={p.name}
                    title={p.name}
                  />
                ))}
              </div>

              {/* Custom colour */}
              <div className="border-t border-[#1a2035] pt-2.5">
                <p className="text-[10px] text-gray-600 mb-1.5 px-0.5">Custom</p>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className="w-6 h-6 rounded-full border border-[#2d3555] group-hover:border-gray-500 transition-colors shrink-0 overflow-hidden"
                    style={{ backgroundColor: accent }}
                  >
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={accent}
                      onChange={(e) => setAccent(e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-mono group-hover:text-gray-300 transition-colors">
                    {accent.toUpperCase()}
                  </span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#05070d]">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <header className="h-14 border-b border-[#1a2035] bg-[#07090f]/90 backdrop-blur-md flex items-center gap-3 px-4 md:px-6 sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2035] transition-colors shrink-0"
              aria-label="Open navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <SearchBar />
            </div>
            <HeaderControls />
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
