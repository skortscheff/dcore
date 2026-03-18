"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect, FormEvent, Suspense } from "react";
import { changesApi, environmentsApi, productsApi, Environment, Product } from "@/lib/api";
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

function NewChangeForm() {
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
    description: "",
    rationale: "",
    impact: "",
    implementation_plan: "",
    validation_plan: "",
    rollback_plan: "",
    itil_category: "Normal",
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
    changesApi.nextId(env.client_id)
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
      const res = await changesApi.create({
        record_id: form.record_id,
        product_id: form.product_id,
        title: form.title,
        description: form.description || undefined,
        rationale: form.rationale || undefined,
        impact: form.impact || undefined,
        implementation_plan: form.implementation_plan || undefined,
        validation_plan: form.validation_plan || undefined,
        rollback_plan: form.rollback_plan || undefined,
        itil_category: form.itil_category || undefined,
        status: "draft",
      });
      router.push(`/changes/${res.data.id}`);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create change request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Link href="/changes" className="text-gray-500 text-sm hover:text-gray-300">← Changes</Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">New Change Request</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Record ID (auto-generated · editable) *${recordIdLoading ? " — generating…" : ""}`}>
              <input required value={form.record_id} onChange={(e) => set("record_id", e.target.value)} className={input} placeholder="Select a product first" />
            </Field>
            <Field label="ITIL Category *">
              <select required value={form.itil_category} onChange={(e) => set("itil_category", e.target.value)} className={input}>
                <option>Normal</option>
                <option>Standard</option>
                <option>Emergency</option>
              </select>
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
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Brief summary of the change" />
          </Field>
          <Field label="Description">
            <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={input} placeholder="Detailed description of what is changing..." />
          </Field>
          <Field label="Rationale">
            <textarea rows={2} value={form.rationale} onChange={(e) => set("rationale", e.target.value)} className={input} placeholder="Why is this change needed?" />
          </Field>
          <Field label="Impact">
            <textarea rows={2} value={form.impact} onChange={(e) => set("impact", e.target.value)} className={input} placeholder="What systems or users are affected?" />
          </Field>
          <Field label="Implementation Plan">
            <textarea rows={4} value={form.implementation_plan} onChange={(e) => set("implementation_plan", e.target.value)} className={input} placeholder="Step-by-step implementation plan..." />
          </Field>
          <Field label="Validation Plan">
            <textarea rows={3} value={form.validation_plan} onChange={(e) => set("validation_plan", e.target.value)} className={input} placeholder="How will success be verified?" />
          </Field>
          <Field label="Rollback Plan">
            <textarea rows={3} value={form.rollback_plan} onChange={(e) => set("rollback_plan", e.target.value)} className={input} placeholder="Steps to revert if needed..." />
          </Field>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium rounded-md transition-colors">
              {saving ? "Saving..." : "Create Change Request"}
            </button>
            <Link href="/changes" className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-md transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default function NewChangePage() {
  return (
    <Suspense>
      <NewChangeForm />
    </Suspense>
  );
}
