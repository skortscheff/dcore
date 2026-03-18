"use client";

import AppLayout from "@/components/AppLayout";
import { useState, FormEvent } from "react";
import { clientsApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    business_context: "",
    critical_services: "",
    sla_tier: "",
    primary_contact: "",
    escalation_path: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await clientsApi.create({
        code: form.code,
        name: form.name,
        business_context: form.business_context || undefined,
        critical_services: form.critical_services || undefined,
        sla_tier: form.sla_tier || undefined,
        primary_contact: form.primary_contact || undefined,
        escalation_path: form.escalation_path || undefined,
      });
      router.push(`/clients/${res.data.id}`);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Link href="/clients" className="text-gray-500 text-sm hover:text-gray-300">← Clients</Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">New Client</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code *" hint="e.g. ACME">
              <input required value={form.code} onChange={(e) => set("code", e.target.value)} className={input} placeholder="ACME" />
            </Field>
            <Field label="Name *">
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={input} placeholder="Acme Corp" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SLA Tier">
              <select value={form.sla_tier} onChange={(e) => set("sla_tier", e.target.value)} className={input}>
                <option value="">— Select —</option>
                <option>Platinum</option>
                <option>Gold</option>
                <option>Silver</option>
                <option>Bronze</option>
              </select>
            </Field>
            <Field label="Primary Contact">
              <input value={form.primary_contact} onChange={(e) => set("primary_contact", e.target.value)} className={input} placeholder="contact@client.com" />
            </Field>
          </div>
          <Field label="Business Context">
            <textarea rows={3} value={form.business_context} onChange={(e) => set("business_context", e.target.value)} className={input} placeholder="Regulated financial institution..." />
          </Field>
          <Field label="Critical Services">
            <textarea rows={2} value={form.critical_services} onChange={(e) => set("critical_services", e.target.value)} className={input} placeholder="Core Banking, Payment Gateway..." />
          </Field>
          <Field label="Escalation Path">
            <textarea rows={2} value={form.escalation_path} onChange={(e) => set("escalation_path", e.target.value)} className={input} placeholder="L1 → L2 → CTO..." />
          </Field>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium rounded-md transition-colors">
              {saving ? "Saving..." : "Create Client"}
            </button>
            <Link href="/clients" className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-md transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}{hint && <span className="text-gray-600 ml-1">{hint}</span>}</label>
      {children}
    </div>
  );
}

const input = "bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";
