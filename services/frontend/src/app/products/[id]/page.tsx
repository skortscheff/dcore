"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { productsApi, runbooksApi, changesApi, exceptionsApi, evidenceApi, Product, Runbook, ChangeRequest, ExceptionRecord, EvidenceRecord } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";

const LIFECYCLE_COLORS: Record<string, string> = {
  operational: "bg-green-800 text-green-200",
  maintenance: "bg-yellow-800 text-yellow-200",
  at_risk: "bg-red-800 text-red-200",
  build: "bg-blue-800 text-blue-200",
  proposed: "bg-gray-700 text-gray-300",
  design: "bg-purple-800 text-purple-200",
  approved: "bg-teal-800 text-teal-200",
  deployment: "bg-indigo-800 text-indigo-200",
  retiring: "bg-orange-800 text-orange-200",
  retired: "bg-gray-800 text-gray-400",
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-green-900 text-green-300",
  degraded: "bg-yellow-900 text-yellow-300",
  at_risk: "bg-red-900 text-red-300",
  unsupported: "bg-gray-800 text-gray-400",
};

const ALLOWED_NEXT: Record<string, string[]> = {
  proposed: ["design"],
  design: ["approved", "proposed"],
  approved: ["build", "design"],
  build: ["deployment", "approved"],
  deployment: ["operational", "build"],
  operational: ["maintenance", "at_risk", "retiring"],
  maintenance: ["operational", "at_risk"],
  at_risk: ["operational", "maintenance", "retiring"],
  retiring: ["retired"],
  retired: [],
};

const HEALTH_STATUSES = ["healthy", "degraded", "at_risk", "unsupported"];
const PRODUCT_TYPES = ["Security", "Application", "Integration", "API", "Analytics", "Infrastructure", "Other"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-gray-200">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-200">{value}</p>
    </div>
  );
}

function ExpiryBadge({ exc }: { exc: ExceptionRecord }) {
  if (!exc.expiry_date) return null;
  if (exc.is_expired) return <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">Expired</span>;
  if (exc.days_until_expiry != null && exc.days_until_expiry <= 30)
    return <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full">{exc.days_until_expiry}d left</span>;
  return <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{exc.days_until_expiry}d left</span>;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    product_type: "",
    vendor: "",
    health_status: "",
    technical_owner: "",
    notes: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const reload = () => {
    if (!id) return;
    Promise.all([
      productsApi.get(id),
      runbooksApi.list(id),
      changesApi.list(id),
      exceptionsApi.list(id),
      evidenceApi.list(id),
    ]).then(([pRes, rRes, cRes, eRes, evRes]) => {
      setProduct(pRes.data);
      setRunbooks(rRes.data);
      setChanges(cRes.data);
      setExceptions(eRes.data);
      setEvidence(evRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  const handleTransition = async (target: string) => {
    if (!product) return;
    setTransitioning(true);
    setTransitionError(null);
    try {
      const res = await productsApi.transition(product.id, target);
      setProduct(res.data);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Transition failed";
      setTransitionError(msg);
    } finally {
      setTransitioning(false);
    }
  };

  const handleEditClick = () => {
    if (!product) return;
    setEditForm({
      name: product.name,
      product_type: product.product_type,
      vendor: product.vendor ?? "",
      health_status: product.health_status,
      technical_owner: product.technical_owner ?? "",
      notes: product.notes ?? "",
    });
    setEditError(null);
    setEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await productsApi.update(product.id, {
        name: editForm.name,
        product_type: editForm.product_type,
        vendor: editForm.vendor || undefined,
        health_status: editForm.health_status,
        technical_owner: editForm.technical_owner || undefined,
        notes: editForm.notes || undefined,
      });
      setProduct(res.data);
      setEditing(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Save failed";
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return <AppLayout><p className="text-gray-400 text-sm animate-pulse">Loading...</p></AppLayout>;
  if (!product) return <AppLayout><p className="text-red-400 text-sm">Product not found.</p></AppLayout>;

  const nextStates = ALLOWED_NEXT[product.lifecycle_state] ?? [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/products" className="text-gray-500 text-sm hover:text-gray-300">← Products</Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${LIFECYCLE_COLORS[product.lifecycle_state] ?? "bg-gray-700 text-gray-300"}`}>
              {product.lifecycle_state}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${HEALTH_COLORS[product.health_status] ?? "bg-gray-700 text-gray-300"}`}>
              {product.health_status}
            </span>
            {!editing && (
              <button
                onClick={handleEditClick}
                className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:border-gray-500 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">{product.record_id} · {product.product_type} · {product.vendor ?? "—"}</p>
        </div>

        {nextStates.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Lifecycle Transition</p>
            <div className="flex flex-wrap gap-2">
              {nextStates.map((s) => (
                <button
                  key={s}
                  onClick={() => handleTransition(s)}
                  disabled={transitioning}
                  className="text-xs px-3 py-1.5 rounded bg-gray-800 border border-gray-700 hover:border-blue-500 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  → {s}
                </button>
              ))}
            </div>
            {transitionError && <p className="text-red-400 text-xs mt-2">{transitionError}</p>}
          </div>
        )}

        {/* Quick-action buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={`/changes/new?product_id=${id}`}
            className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:border-blue-500 transition-colors"
          >
            + New Change Request
          </Link>
          <Link
            href={`/exceptions/new?product_id=${id}`}
            className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:border-yellow-500 transition-colors"
          >
            + New Exception
          </Link>
          <Link
            href={`/runbooks/new?product_id=${id}`}
            className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:border-green-500 transition-colors"
          >
            + New Runbook
          </Link>
          <Link
            href={`/evidence/upload?product_id=${id}`}
            className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:border-purple-500 transition-colors"
          >
            + Upload Evidence
          </Link>
        </div>

        {editing ? (
          <form onSubmit={handleSaveEdit} className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-8 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Name *</label>
              <input
                required value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Product Type *</label>
              <select
                value={editForm.product_type}
                onChange={(e) => setEditForm({ ...editForm, product_type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Vendor</label>
              <input
                value={editForm.vendor}
                onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                placeholder="e.g. Palo Alto Networks"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Health Status</label>
              <select
                value={editForm.health_status}
                onChange={(e) => setEditForm({ ...editForm, health_status: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                {HEALTH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Technical Owner</label>
              <input
                value={editForm.technical_owner}
                onChange={(e) => setEditForm({ ...editForm, technical_owner: e.target.value })}
                placeholder="e.g. alice@acme.com"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            {editError && <p className="col-span-2 text-red-400 text-xs">{editError}</p>}
            <div className="col-span-2 flex gap-3">
              <button
                type="submit" disabled={editSaving}
                className="px-5 py-2 bg-green-800 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-8 grid grid-cols-2 gap-4">
            <Field label="Technical Owner" value={product.technical_owner} />
            <Field label="Last Validated" value={product.last_validated ? new Date(product.last_validated).toLocaleDateString() : null} />
            <Field label="Notes" value={product.notes} />
          </div>
        )}

        <Section title={`Runbooks (${runbooks.length})`}>
          {runbooks.length === 0 ? <p className="text-gray-500 text-sm">None.</p> : (
            <div className="flex flex-col gap-2">
              {runbooks.map((r) => (
                <Link key={r.id} href={`/runbooks/${r.id}`} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-white">{r.title}</p>
                    <span className="text-xs text-gray-500">{r.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Change Requests (${changes.length})`}>
          {changes.length === 0 ? <p className="text-gray-500 text-sm">None.</p> : (
            <div className="flex flex-col gap-2">
              {changes.map((c) => (
                <Link key={c.id} href={`/changes/${c.id}`} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-white">{c.title}</p>
                    <span className="text-xs text-gray-500">{c.record_id} · {c.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Exceptions (${exceptions.length})`}>
          {exceptions.length === 0 ? <p className="text-gray-500 text-sm">None.</p> : (
            <div className="flex flex-col gap-2">
              {exceptions.map((e) => (
                <Link key={e.id} href={`/exceptions/${e.id}`} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-white">{e.title}</p>
                    <div className="flex items-center gap-2">
                      <ExpiryBadge exc={e} />
                      <span className="text-xs text-gray-500">{e.status}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Evidence (${evidence.length})`}>
          {evidence.length === 0 ? <p className="text-gray-500 text-sm">None.</p> : (
            <div className="flex flex-col gap-2">
              {evidence.map((ev) => (
                <div key={ev.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-white">{ev.title}</p>
                      {ev.file_name && <p className="text-xs text-gray-500 mt-0.5">{ev.file_name}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {ev.cobit_control && <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">{ev.cobit_control}</span>}
                      <span className="text-xs text-gray-500">{ev.artifact_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </AppLayout>
  );
}
