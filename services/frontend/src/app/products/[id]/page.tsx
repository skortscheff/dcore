"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { productsApi, runbooksApi, changesApi, exceptionsApi, evidenceApi, Product, Runbook, ChangeRequest, ExceptionRecord, EvidenceRecord } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";

const LIFECYCLE: Record<string, { dot: string; text: string; bg: string }> = {
  operational: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-950/50 border-emerald-900/40" },
  maintenance:  { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-950/50 border-amber-900/40" },
  at_risk:      { dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-950/50 border-red-900/40" },
  build:        { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-950/50 border-blue-900/40" },
  proposed:     { dot: "bg-gray-500",    text: "text-gray-400",    bg: "bg-gray-800/50 border-gray-700/40" },
  design:       { dot: "bg-purple-400",  text: "text-purple-400",  bg: "bg-purple-950/50 border-purple-900/40" },
  approved:     { dot: "bg-teal-400",    text: "text-teal-400",    bg: "bg-teal-950/50 border-teal-900/40" },
  deployment:   { dot: "bg-indigo-400",  text: "text-indigo-400",  bg: "bg-indigo-950/50 border-indigo-900/40" },
  retiring:     { dot: "bg-orange-400",  text: "text-orange-400",  bg: "bg-orange-950/50 border-orange-900/40" },
  retired:      { dot: "bg-gray-600",    text: "text-gray-500",    bg: "bg-gray-900/50 border-gray-800/40" },
};
const HEALTH: Record<string, { dot: string; text: string; bg: string }> = {
  healthy:     { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-950/50 border-emerald-900/40" },
  degraded:    { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-950/50 border-amber-900/40" },
  at_risk:     { dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-950/50 border-red-900/40" },
  unsupported: { dot: "bg-gray-600",    text: "text-gray-500",    bg: "bg-gray-900/50 border-gray-800/40" },
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

const inp = "input-base";

function Badge({ state, map }: { state: string; map: Record<string, { dot: string; text: string; bg: string }> }) {
  const c = map[state] ?? map.proposed ?? { dot: "bg-gray-500", text: "text-gray-400", bg: "bg-gray-800/50 border-gray-700/40" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {state.replace("_", " ")}
    </span>
  );
}

function SectionHeader({ title, count, action }: { title: string; count: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        {title} <span className="text-gray-600 normal-case font-normal">({count})</span>
      </h2>
      {action}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-200">{value}</p>
    </div>
  );
}

function ExpiryPill({ exc }: { exc: ExceptionRecord }) {
  if (!exc.expiry_date) return null;
  if (exc.is_expired) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-950/50 border border-red-900/40 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Expired</span>;
  if (exc.days_until_expiry != null && exc.days_until_expiry <= 30)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-950/50 border border-amber-900/40 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{exc.days_until_expiry}d</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-800/50 border border-gray-700/40 text-gray-500">{exc.days_until_expiry}d</span>;
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

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", product_type: "", vendor: "", serial_number: "", health_status: "", technical_owner: "", notes: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const reload = () => {
    if (!id) return;
    Promise.all([
      productsApi.get(id), runbooksApi.list(id),
      changesApi.list(id), exceptionsApi.list(id), evidenceApi.list(id),
    ]).then(([pRes, rRes, cRes, eRes, evRes]) => {
      setProduct(pRes.data); setRunbooks(rRes.data);
      setChanges(cRes.data); setExceptions(eRes.data); setEvidence(evRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  const handleTransition = async (target: string) => {
    if (!product) return;
    setTransitioning(true); setTransitionError(null);
    try { const res = await productsApi.transition(product.id, target); setProduct(res.data); }
    catch (e: unknown) { setTransitionError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Transition failed"); }
    finally { setTransitioning(false); }
  };

  const handleEditClick = () => {
    if (!product) return;
    setEditForm({ name: product.name, product_type: product.product_type, vendor: product.vendor ?? "", serial_number: product.serial_number ?? "", health_status: product.health_status, technical_owner: product.technical_owner ?? "", notes: product.notes ?? "" });
    setEditError(null); setEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setEditSaving(true); setEditError(null);
    try {
      const res = await productsApi.update(product.id, {
        name: editForm.name, product_type: editForm.product_type,
        vendor: editForm.vendor || undefined, serial_number: editForm.serial_number || undefined,
        health_status: editForm.health_status, technical_owner: editForm.technical_owner || undefined,
        notes: editForm.notes || undefined,
      });
      setProduct(res.data); setEditing(false);
    } catch (e: unknown) {
      setEditError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Save failed");
    } finally { setEditSaving(false); }
  };

  if (loading) return <AppLayout><div className="flex items-center gap-2 text-gray-600 text-sm animate-pulse p-6"><span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />Loading…</div></AppLayout>;
  if (!product) return <AppLayout><p className="text-red-400 text-sm p-6">Product not found.</p></AppLayout>;

  const nextStates = ALLOWED_NEXT[product.lifecycle_state] ?? [];
  const lc = LIFECYCLE[product.lifecycle_state] ?? LIFECYCLE.proposed;
  const hc = HEALTH[product.health_status] ?? HEALTH.healthy;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors mb-5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Products
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold gradient-text leading-tight">{product.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {product.record_id}
                <span className="mx-2 text-gray-700">·</span>{product.product_type}
                {product.vendor && <><span className="mx-2 text-gray-700">·</span>{product.vendor}</>}
                {product.serial_number && <><span className="mx-2 text-gray-700">·</span><span className="text-gray-500">S/N:</span> {product.serial_number}</>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge state={product.lifecycle_state} map={LIFECYCLE} />
              <Badge state={product.health_status} map={HEALTH} />
              {!editing && (
                <button onClick={handleEditClick} className="btn-ghost text-xs px-3 py-1.5">Edit</button>
              )}
            </div>
          </div>
        </div>

        {/* Lifecycle transitions */}
        {nextStates.length > 0 && (
          <div className="card p-4 mb-5">
            <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-3 font-medium">Lifecycle Transition</p>
            <div className="flex flex-wrap gap-2">
              {nextStates.map((s) => {
                const c = LIFECYCLE[s] ?? LIFECYCLE.proposed;
                return (
                  <button
                    key={s}
                    onClick={() => handleTransition(s)}
                    disabled={transitioning}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 disabled:opacity-40
                      bg-[#0a0e1a] border-[#1a2035] text-gray-400 hover:${c.bg} hover:${c.text} hover:border-current/30`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    {s}
                  </button>
                );
              })}
            </div>
            {transitionError && <p className="text-red-400 text-xs mt-3">{transitionError}</p>}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { href: `/changes/new?product_id=${id}`, label: "+ Change Request", color: "hover:border-indigo-600/50 hover:text-indigo-300" },
            { href: `/exceptions/new?product_id=${id}`, label: "+ Exception", color: "hover:border-amber-600/50 hover:text-amber-300" },
            { href: `/runbooks/new?product_id=${id}`, label: "+ Runbook", color: "hover:border-emerald-600/50 hover:text-emerald-300" },
            { href: `/evidence/upload?product_id=${id}`, label: "+ Evidence", color: "hover:border-violet-600/50 hover:text-violet-300" },
          ].map(({ href, label, color }) => (
            <Link key={href} href={href} className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs text-gray-500 bg-[#0a0e1a] border border-[#1a2035] transition-all ${color}`}>
              {label}
            </Link>
          ))}
        </div>

        {/* Edit form / detail grid */}
        {editing ? (
          <form onSubmit={handleSaveEdit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Name *</label>
              <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Product Type *</label>
              <select value={editForm.product_type} onChange={(e) => setEditForm({ ...editForm, product_type: e.target.value })} className={inp}>
                {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Vendor</label>
              <input value={editForm.vendor} onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })} placeholder="e.g. Palo Alto Networks" className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Serial Number</label>
              <input value={editForm.serial_number} onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })} placeholder="e.g. PA-VM-2024-001" className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Health Status</label>
              <select value={editForm.health_status} onChange={(e) => setEditForm({ ...editForm, health_status: e.target.value })} className={inp}>
                {HEALTH_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Technical Owner</label>
              <input value={editForm.technical_owner} onChange={(e) => setEditForm({ ...editForm, technical_owner: e.target.value })} placeholder="e.g. alice@acme.com" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-600 block mb-1.5">Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className={inp} />
            </div>
            {editError && <p className="sm:col-span-2 text-red-400 text-xs">{editError}</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={editSaving} className="btn-primary disabled:opacity-50">{editSaving ? "Saving…" : "Save Changes"}</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="card p-5 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Technical Owner" value={product.technical_owner} />
            <Field label="Serial Number" value={product.serial_number} />
            <Field label="Last Validated" value={product.last_validated ? new Date(product.last_validated).toLocaleDateString() : null} />
            {product.notes && <div className="col-span-2 sm:col-span-3"><Field label="Notes" value={product.notes} /></div>}
          </div>
        )}

        {/* Runbooks */}
        <div className="mb-8">
          <SectionHeader title="Runbooks" count={runbooks.length} action={<Link href={`/runbooks/new?product_id=${id}`} className="text-xs text-indigo-500 hover:text-indigo-300 transition-colors">+ Add</Link>} />
          {runbooks.length === 0 ? <p className="text-gray-700 text-sm">None yet.</p> : (
            <div className="flex flex-col gap-2">
              {runbooks.map((r) => (
                <Link key={r.id} href={`/runbooks/${r.id}`} className="card card-hover flex items-center justify-between px-4 py-3 group">
                  <p className="text-sm text-white">{r.title}</p>
                  <span className="text-xs text-gray-600">{r.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Changes */}
        <div className="mb-8">
          <SectionHeader title="Change Requests" count={changes.length} action={<Link href={`/changes/new?product_id=${id}`} className="text-xs text-indigo-500 hover:text-indigo-300 transition-colors">+ Add</Link>} />
          {changes.length === 0 ? <p className="text-gray-700 text-sm">None yet.</p> : (
            <div className="flex flex-col gap-2">
              {changes.map((c) => (
                <Link key={c.id} href={`/changes/${c.id}`} className="card card-hover flex items-center justify-between px-4 py-3 group">
                  <p className="text-sm text-white">{c.title}</p>
                  <span className="text-xs text-gray-600">{c.record_id} · {c.status.replace("_", " ")}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Exceptions */}
        <div className="mb-8">
          <SectionHeader title="Exceptions" count={exceptions.length} action={<Link href={`/exceptions/new?product_id=${id}`} className="text-xs text-indigo-500 hover:text-indigo-300 transition-colors">+ Add</Link>} />
          {exceptions.length === 0 ? <p className="text-gray-700 text-sm">None yet.</p> : (
            <div className="flex flex-col gap-2">
              {exceptions.map((e) => (
                <Link key={e.id} href={`/exceptions/${e.id}`} className="card card-hover flex items-center justify-between px-4 py-3 group">
                  <p className="text-sm text-white">{e.title}</p>
                  <div className="flex items-center gap-2">
                    <ExpiryPill exc={e} />
                    <span className="text-xs text-gray-600">{e.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Evidence */}
        <div className="mb-8">
          <SectionHeader title="Evidence" count={evidence.length} action={<Link href={`/evidence/upload?product_id=${id}`} className="text-xs text-indigo-500 hover:text-indigo-300 transition-colors">+ Upload</Link>} />
          {evidence.length === 0 ? <p className="text-gray-700 text-sm">None yet.</p> : (
            <div className="flex flex-col gap-2">
              {evidence.map((ev) => (
                <div key={ev.id} className="card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{ev.title}</p>
                    {ev.file_name && <p className="text-xs text-gray-600 mt-0.5">{ev.file_name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.cobit_control && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950/50 border border-indigo-900/40 text-indigo-400">{ev.cobit_control}</span>}
                    <span className="text-xs text-gray-600">{ev.artifact_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
