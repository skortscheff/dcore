"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useRef, useState } from "react";
import { evidenceApi, EvidenceRecord } from "@/lib/api";

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ product_id: "", title: "", artifact_type: "screenshot", cobit_control: "", itil_process: "" });

  const reload = () =>
    evidenceApi.list()
      .then((r) => setEvidence(r.data))
      .catch(() => setError("Failed to load evidence."))
      .finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) { setUploadError("Select a file."); return; }
    const fd = new FormData();
    fd.append("product_id", form.product_id);
    fd.append("title", form.title);
    fd.append("artifact_type", form.artifact_type);
    if (form.cobit_control) fd.append("cobit_control", form.cobit_control);
    if (form.itil_process) fd.append("itil_process", form.itil_process);
    fd.append("file", fileRef.current.files[0]);
    setUploading(true);
    setUploadError("");
    try {
      await evidenceApi.upload(fd);
      setShowForm(false);
      setForm({ product_id: "", title: "", artifact_type: "screenshot", cobit_control: "", itil_process: "" });
      setLoading(true);
      reload();
    } catch (e: unknown) {
      setUploadError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string, fileName?: string) => {
    try {
      const r = await evidenceApi.downloadUrl(id);
      const a = document.createElement("a");
      a.href = r.data.url;
      a.download = r.data.file_name ?? fileName ?? "evidence";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch { alert("No file attached to this evidence record."); }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Evidence</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded"
          >
            {showForm ? "Cancel" : "+ Upload Evidence"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleUpload} className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Product ID *</label>
              <input required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="UUID" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Artifact Type *</label>
              <select value={form.artifact_type} onChange={(e) => setForm({ ...form, artifact_type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                {["screenshot", "log_export", "config_snapshot", "report", "policy_doc", "other"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">COBIT Control</label>
              <input value={form.cobit_control} onChange={(e) => setForm({ ...form, cobit_control: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="e.g. DSS05.03" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">ITIL Process</label>
              <input value={form.itil_process} onChange={(e) => setForm({ ...form, itil_process: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="e.g. Incident Management" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1">File *</label>
              <input ref={fileRef} type="file" required className="text-sm text-gray-300" />
            </div>
            {uploadError && <p className="col-span-2 text-red-400 text-xs">{uploadError}</p>}
            <div className="col-span-2">
              <button type="submit" disabled={uploading}
                className="px-5 py-2 bg-green-800 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50">
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && evidence.length === 0 && <p className="text-gray-500 text-sm">No evidence records yet.</p>}
        <div className="flex flex-col gap-3">
          {evidence.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4">
              <div>
                <p className="font-medium text-white">{ev.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ev.artifact_type}
                  {ev.file_name && ` · ${ev.file_name}`}
                  {ev.cobit_control && ` · ${ev.cobit_control}`}
                  {ev.itil_process && ` · ${ev.itil_process}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {new Date(ev.captured_at ?? ev.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDownload(ev.id, ev.file_name)}
                  className={`text-xs underline ${ev.storage_path ? "text-blue-400 hover:text-blue-300" : "text-gray-600 cursor-not-allowed"}`}
                  title={ev.storage_path ? `Download ${ev.file_name ?? "file"}` : "No file uploaded"}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
