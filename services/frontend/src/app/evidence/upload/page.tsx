"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect, FormEvent, Suspense } from "react";
import { evidenceApi, productsApi, changesApi, Product, ChangeRequest } from "@/lib/api";
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

function EvidenceUploadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    product_id: searchParams.get("product_id") ?? "",
    title: "",
    artifact_type: "report",
    cobit_control: "",
    itil_process: "",
    related_change_id: "",
  });

  useEffect(() => {
    productsApi.list().then((r) => setProducts(r.data));
    changesApi.list().then((r) => setChanges(r.data));
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a file."); return; }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("product_id", form.product_id);
      fd.append("title", form.title);
      fd.append("artifact_type", form.artifact_type);
      fd.append("file", file);
      if (form.cobit_control) fd.append("cobit_control", form.cobit_control);
      if (form.itil_process) fd.append("itil_process", form.itil_process);
      if (form.related_change_id) fd.append("related_change_id", form.related_change_id);
      const res = await evidenceApi.upload(fd);
      router.push(`/evidence/${res.data.id}`);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Upload failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Link href="/evidence" className="text-gray-500 text-sm hover:text-gray-300">← Evidence</Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">Upload Evidence</h1>
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
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="e.g. Vulnerability Scan November 2026" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Artifact Type *">
              <select value={form.artifact_type} onChange={(e) => set("artifact_type", e.target.value)} className={input}>
                <option value="report">Report</option>
                <option value="screenshot">Screenshot</option>
                <option value="log">Log</option>
                <option value="certificate">Certificate</option>
                <option value="policy">Policy</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="COBIT Control">
              <input value={form.cobit_control} onChange={(e) => set("cobit_control", e.target.value)} className={input} placeholder="e.g. DSS05.07" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="ITIL Process">
              <input value={form.itil_process} onChange={(e) => set("itil_process", e.target.value)} className={input} placeholder="e.g. Information Security Management" />
            </Field>
            <Field label="Related Change Request">
              <select value={form.related_change_id} onChange={(e) => set("related_change_id", e.target.value)} className={input}>
                <option value="">— None —</option>
                {changes.map((c) => (
                  <option key={c.id} value={c.id}>{c.record_id} — {c.title}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="File *">
            <input
              required
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-300 w-full file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-700 file:text-gray-200 file:text-xs cursor-pointer"
            />
          </Field>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium rounded-md transition-colors">
              {saving ? "Uploading..." : "Upload Evidence"}
            </button>
            <Link href="/evidence" className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-md transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default function EvidenceUploadPage() {
  return (
    <Suspense>
      <EvidenceUploadForm />
    </Suspense>
  );
}
