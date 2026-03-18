"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect, FormEvent, Suspense } from "react";
import { exceptionsApi, environmentsApi, productsApi, Environment, Product } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const input = "bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function NewExceptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recordIdLoading, setRecordIdLoading] = useState(false);
  const [form, setForm] = useState({
    record_id: "",
    product_id: searchParams.get("product_id") ?? "",
    title: "",
    reason: "",
    risk_introduced: "",
    compensating_controls: "",
    cobit_control: "",
    expiry_date: "",
  });

  useEffect(() => {
    Promise.all([
      productsApi.list(),
      environmentsApi.list(),
    ]).then(([pRes, eRes]) => {
      setProducts(pRes.data);
      setEnvironments(eRes.data);
    });
  }, []);

  // Auto-fetch record_id when product selection or data changes
  useEffect(() => {
    if (!form.product_id || !environments.length || !products.length) return;
    const product = products.find((p) => p.id === form.product_id);
    if (!product) return;
    const env = environments.find((e) => e.id === product.environment_id);
    if (!env) return;
    setRecordIdLoading(true);
    exceptionsApi.nextId(env.client_id)
      .then((r) => setForm((f) => ({ ...f, record_id: r.data.record_id })))
      .catch(() => {})
      .finally(() => setRecordIdLoading(false));
  }, [form.product_id, products, environments]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await exceptionsApi.create({
        record_id: form.record_id,
        product_id: form.product_id,
        title: form.title,
        reason: form.reason || undefined,
        risk_introduced: form.risk_introduced || undefined,
        compensating_controls: form.compensating_controls || undefined,
        cobit_control: form.cobit_control || undefined,
        expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : undefined,
        status: "draft",
      });
      router.push(`/exceptions/${res.data.id}`);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create exception.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Link href="/exceptions" className="text-gray-500 text-sm hover:text-gray-300">← Exceptions</Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">New Exception Record</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Record ID (auto-generated · editable) *${recordIdLoading ? " — generating…" : ""}`}>
              <input required value={form.record_id} onChange={(e) => set("record_id", e.target.value)} className={input} placeholder="Select a product first" />
            </Field>
            <Field label="COBIT Control">
              <input value={form.cobit_control} onChange={(e) => set("cobit_control", e.target.value)} className={input} placeholder="e.g. DSS05.04" />
            </Field>
          </div>
          <Field label="Product *">
            <select required value={form.product_id} onChange={(e) => set("product_id", e.target.value)} className={input}>
              <option value="">— Select product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.record_id})</option>
              ))}
            </select>
          </Field>
          <Field label="Title *">
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Brief description of the exception" />
          </Field>
          <Field label="Expiry Date *">
            <input required type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} className={input} />
          </Field>
          <Field label="Reason *">
            <textarea required rows={3} value={form.reason} onChange={(e) => set("reason", e.target.value)} className={input} placeholder="Why is this exception being raised?" />
          </Field>
          <Field label="Risk Introduced">
            <textarea rows={3} value={form.risk_introduced} onChange={(e) => set("risk_introduced", e.target.value)} className={input} placeholder="What risk does this exception introduce?" />
          </Field>
          <Field label="Compensating Controls">
            <textarea rows={4} value={form.compensating_controls} onChange={(e) => set("compensating_controls", e.target.value)} className={input} placeholder="1. Increased monitoring
2. Access restrictions
3. ..." />
          </Field>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium rounded-md transition-colors">
              {saving ? "Saving..." : "Create Exception"}
            </button>
            <Link href="/exceptions" className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-md transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default function NewExceptionPage() {
  return (
    <Suspense>
      <NewExceptionForm />
    </Suspense>
  );
}
