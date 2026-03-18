"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect, FormEvent, Suspense } from "react";
import { runbooksApi, productsApi, Product } from "@/lib/api";
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

function NewRunbookForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    product_id: searchParams.get("product_id") ?? "",
    title: "",
    trigger: "",
    pre_checks: "",
    steps: "",
    validation: "",
    rollback: "",
    escalation: "",
  });

  useEffect(() => {
    productsApi.list().then((r) => setProducts(r.data));
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await runbooksApi.create({
        product_id: form.product_id,
        title: form.title,
        trigger: form.trigger || undefined,
        pre_checks: form.pre_checks || undefined,
        steps: form.steps || undefined,
        validation: form.validation || undefined,
        rollback: form.rollback || undefined,
        escalation: form.escalation || undefined,
        status: "draft",
      });
      router.push(`/runbooks/${res.data.id}`);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create runbook.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Link href="/runbooks" className="text-gray-500 text-sm hover:text-gray-300">← Runbooks</Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">New Runbook</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Product *">
            <select required value={form.product_id} onChange={(e) => set("product_id", e.target.value)} className={input}>
              <option value="">— Select product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.record_id})</option>
              ))}
            </select>
          </Field>
          <Field label="Title *">
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="e.g. Emergency Restart Procedure" />
          </Field>
          <Field label="Trigger">
            <textarea rows={2} value={form.trigger} onChange={(e) => set("trigger", e.target.value)} className={input} placeholder="What condition triggers this runbook?" />
          </Field>
          <Field label="Pre-checks">
            <textarea rows={3} value={form.pre_checks} onChange={(e) => set("pre_checks", e.target.value)} className={input} placeholder="1. Verify no active batch jobs
2. Confirm DB is stable" />
          </Field>
          <Field label="Steps *">
            <textarea required rows={6} value={form.steps} onChange={(e) => set("steps", e.target.value)} className={input} placeholder="1. SSH to primary node
2. Check service status
3. ..." />
          </Field>
          <Field label="Validation">
            <textarea rows={2} value={form.validation} onChange={(e) => set("validation", e.target.value)} className={input} placeholder="How do you confirm success?" />
          </Field>
          <Field label="Rollback">
            <textarea rows={2} value={form.rollback} onChange={(e) => set("rollback", e.target.value)} className={input} placeholder="Steps to revert if needed..." />
          </Field>
          <Field label="Escalation">
            <textarea rows={2} value={form.escalation} onChange={(e) => set("escalation", e.target.value)} className={input} placeholder="L1 → L2 → Vendor support..." />
          </Field>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium rounded-md transition-colors">
              {saving ? "Saving..." : "Create Runbook"}
            </button>
            <Link href="/runbooks" className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-md transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default function NewRunbookPage() {
  return (
    <Suspense>
      <NewRunbookForm />
    </Suspense>
  );
}
