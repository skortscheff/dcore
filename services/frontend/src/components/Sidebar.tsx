"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const nav = [
  { href: "/dashboard",  label: "Dashboard" },
  { href: "/clients",    label: "Clients" },
  { href: "/products",   label: "Products" },
  { href: "/runbooks",   label: "Runbooks" },
  { href: "/changes",    label: "Changes" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/evidence",   label: "Evidence" },
  { href: "/audit",      label: "Audit Log" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside className="w-52 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="text-white font-bold text-lg tracking-tight">Dcore</p>
        <p className="text-gray-500 text-xs mt-0.5">MSSP Platform</p>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-gray-800 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 truncate mb-2">{user.preferred_username ?? user.email ?? user.sub}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
