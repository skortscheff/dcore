"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { clientsApi, environmentsApi, productsApi, Client, Environment, Product } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

const LIFECYCLE_STATES = ["proposed", "design", "approved", "build", "deployment", "operational", "maintenance", "at_risk", "retiring", "retired"];
const HEALTH_STATUSES = ["healthy", "degraded", "at_risk", "unsupported"];
const PRODUCT_TYPES = ["Security", "Application", "Integration", "API", "Analytics", "Infrastructure", "Other"];

const emptyProductForm = {
  record_id: "",
  name: "",
  environment_id: "",
  product_type: "Security",
  vendor: "",
  serial_number: "",
  lifecycle_state: "proposed",
  health_status: "healthy",
  technical_owner: "",
  notes: "",
};

function SectionHeader({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {count !== undefined && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700/50">{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productSaving, setProductSaving] = useState(false);
  const [productFormError, setProductFormError] = useState("");
  const [recordIdLoading, setRecordIdLoading] = useState(false);

  // Environment form state
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [envForm, setEnvForm] = useState({ name: "", description: "" });
  const [envSaving, setEnvSaving] = useState(false);
  const [envFormError, setEnvFormError] = useState("");

  // Client edit state
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: "",
    business_context: "",
    critical_services: "",
    sla_tier: "",
    primary_contact: "",
    escalation_path: "",
  });
  const [clientSaving, setClientSaving] = useState(false);
  const [clientError, setClientError] = useState("");

  const reload = () => {
    if (!id) return;
    Promise.all([
      clientsApi.get(id),
      environmentsApi.list(id),
    ]).then(async ([cRes, eRes]) => {
      setClient(cRes.data);
      setEnvironments(eRes.data);
      const allProducts = await Promise.all(
        eRes.data.map((e) => productsApi.list(e.id).then((r) => r.data))
      );
      setProducts(allProducts.flat());
    }).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  // Environment handlers
  const handleAddEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvFormError("");
    setEnvSaving(true);
    try {
      await environmentsApi.create({
        client_id: id,
        name: envForm.name,
        description: envForm.description || undefined,
      });
      setShowEnvForm(false);
      setEnvForm({ name: "", description: "" });
      reload();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setEnvFormError(detail ?? "Failed to create environment.");
    } finally {
      setEnvSaving(false);
    }
  };

  // Product handlers
  const handleEnvChange = async (envId: string) => {
    setProductForm((f) => ({ ...f, environment_id: envId, record_id: "" }));
    if (!envId) return;
    setRecordIdLoading(true);
    try {
      const res = await productsApi.nextId(envId);
      setProductForm((f) => ({ ...f, record_id: res.data.record_id }));
    } catch {
      // leave blank for manual entry
    } finally {
      setRecordIdLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError("");
    setProductSaving(true);
    try {
      const created = await productsApi.create({
        record_id: productForm.record_id,
        name: productForm.name,
        environment_id: productForm.environment_id,
        product_type: productForm.product_type,
        vendor: productForm.vendor || undefined,
        serial_number: productForm.serial_number || undefined,
        lifecycle_state: productForm.lifecycle_state,
        health_status: productForm.health_status,
        technical_owner: productForm.technical_owner || undefined,
        notes: productForm.notes || undefined,
      });
      setShowProductForm(false);
      setProductForm(emptyProductForm);
      router.push(`/products/${created.data.id}`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setProductFormError(detail ?? "Failed to create product.");
    } finally {
      setProductSaving(false);
    }
  };

  // Client edit handlers
  const handleEditClient = () => {
    if (!client) return;
    setClientForm({
      name: client.name,
      business_context: client.business_context ?? "",
      critical_services: client.critical_services ?? "",
      sla_tier: client.sla_tier ?? "",
      primary_contact: client.primary_contact ?? "",
      escalation_path: client.escalation_path ?? "",
    });
    setClientError("");
    setEditingClient(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");
    setClientSaving(true);
    try {
      const res = await clientsApi.update(id, {
        name: clientForm.name,
        business_context: clientForm.business_context || undefined,
        critical_services: clientForm.critical_services || undefined,
        sla_tier: clientForm.sla_tier || undefined,
        primary_contact: clientForm.primary_contact || undefined,
        escalation_path: clientForm.escalation_path || undefined,
      });
      setClient(res.data);
      setEditingClient(false);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setClientError(detail ?? "Failed to save client.");
    } finally {
      setClientSaving(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-3">
        {[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse" />)}
      </div>
    </AppLayout>
  );
  if (!client) return <AppLayout><p className="text-red-400 text-sm">Client not found.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumb + header */}
        <div className="mb-6">
          <Link href="/clients" className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1 mb-3 w-fit">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Clients
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-950/60 border border-indigo-900/40 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                {client.code.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">{client.name}</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {client.code}
                  {client.sla_tier && <span className="ml-2">· SLA: {client.sla_tier}</span>}
                  {client.primary_contact && <span className="ml-2 hidden sm:inline">· {client.primary_contact}</span>}
                </p>
              </div>
            </div>
            {!editingClient && (
              <button onClick={handleEditClient} className="btn-ghost text-xs">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Client edit form */}
        {editingClient ? (
          <form onSubmit={handleSaveClient} className="card p-5 mb-8">
            <h3 className="text-sm font-semibold text-white mb-4">Edit Client</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Name *</label>
                <input
                  required value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">SLA Tier</label>
                <input
                  value={clientForm.sla_tier}
                  onChange={(e) => setClientForm({ ...clientForm, sla_tier: e.target.value })}
                  placeholder="e.g. Platinum"
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Primary Contact</label>
                <input
                  value={clientForm.primary_contact}
                  onChange={(e) => setClientForm({ ...clientForm, primary_contact: e.target.value })}
                  placeholder="e.g. cto@acme.com"
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Business Context</label>
                <textarea
                  value={clientForm.business_context}
                  onChange={(e) => setClientForm({ ...clientForm, business_context: e.target.value })}
                  rows={2}
                  className="input-base resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Critical Services</label>
                <textarea
                  value={clientForm.critical_services}
                  onChange={(e) => setClientForm({ ...clientForm, critical_services: e.target.value })}
                  rows={2}
                  className="input-base resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Escalation Path</label>
                <textarea
                  value={clientForm.escalation_path}
                  onChange={(e) => setClientForm({ ...clientForm, escalation_path: e.target.value })}
                  rows={2}
                  className="input-base resize-none"
                />
              </div>
            </div>
            {clientError && <p className="mt-3 text-red-400 text-xs">{clientError}</p>}
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={clientSaving} className="btn-primary text-xs disabled:opacity-50">
                {clientSaving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditingClient(false)} className="btn-ghost text-xs">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* Info grid */
          (client.business_context || client.primary_contact || client.critical_services) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {client.business_context && (
                <div className="card p-4">
                  <p className="text-xs text-gray-600 mb-1">Business Context</p>
                  <p className="text-sm text-gray-300">{client.business_context}</p>
                </div>
              )}
              {client.primary_contact && (
                <div className="card p-4">
                  <p className="text-xs text-gray-600 mb-1">Primary Contact</p>
                  <p className="text-sm text-gray-300">{client.primary_contact}</p>
                </div>
              )}
              {client.critical_services && (
                <div className="card p-4 sm:col-span-2">
                  <p className="text-xs text-gray-600 mb-1">Critical Services</p>
                  <p className="text-sm text-gray-300">{client.critical_services}</p>
                </div>
              )}
            </div>
          )
        )}

        {/* Environments section */}
        <div className="mb-8">
          <SectionHeader
            title="Environments"
            count={environments.length}
            action={
              <button
                onClick={() => { setShowEnvForm(!showEnvForm); setEnvFormError(""); }}
                className="btn-ghost text-xs"
              >
                {showEnvForm ? "Cancel" : "+ Add Environment"}
              </button>
            }
          />

          {showEnvForm && (
            <form onSubmit={handleAddEnvironment} className="card p-4 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Name *</label>
                  <input
                    required value={envForm.name}
                    onChange={(e) => setEnvForm({ ...envForm, name: e.target.value })}
                    placeholder="e.g. Production"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Description</label>
                  <input
                    value={envForm.description}
                    onChange={(e) => setEnvForm({ ...envForm, description: e.target.value })}
                    placeholder="e.g. Live production environment"
                    className="input-base"
                  />
                </div>
              </div>
              {envFormError && <p className="mt-2 text-red-400 text-xs">{envFormError}</p>}
              <div className="mt-3">
                <button type="submit" disabled={envSaving} className="btn-primary text-xs disabled:opacity-50">
                  {envSaving ? "Creating…" : "Create Environment"}
                </button>
              </div>
            </form>
          )}

          {environments.length === 0 ? (
            <p className="text-gray-600 text-xs py-4 text-center">No environments yet — add one above before creating products.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {environments.map((env) => (
                <div key={env.id} className="card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{env.name}</p>
                    {env.description && <p className="text-xs text-gray-600 mt-0.5">{env.description}</p>}
                  </div>
                  <span className="text-xs text-gray-700 font-mono">{env.id.slice(0, 8)}…</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products section */}
        <div>
          <SectionHeader
            title="Products"
            count={products.length}
            action={
              environments.length > 0 ? (
                <button
                  onClick={() => { setShowProductForm(!showProductForm); setProductFormError(""); }}
                  className="btn-ghost text-xs"
                >
                  {showProductForm ? "Cancel" : "+ Add Product"}
                </button>
              ) : undefined
            }
          />

          {environments.length === 0 && (
            <p className="text-gray-600 text-xs mb-4">Add an environment above to enable product creation.</p>
          )}

          {showProductForm && (
            <form onSubmit={handleAddProduct} className="card p-5 mb-4">
              <h3 className="text-sm font-semibold text-white mb-4">New Product</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Environment *</label>
                  <select
                    required value={productForm.environment_id}
                    onChange={(e) => handleEnvChange(e.target.value)}
                    className="input-base"
                  >
                    <option value="">Select environment…</option>
                    {environments.map((env) => (
                      <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Record ID (auto-generated · editable) *
                    {recordIdLoading && <span className="ml-2 text-indigo-400 italic">generating…</span>}
                  </label>
                  <input
                    required value={productForm.record_id}
                    onChange={(e) => setProductForm({ ...productForm, record_id: e.target.value })}
                    placeholder="Select an environment first"
                    className="input-base font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Name *</label>
                  <input
                    required value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. Palo Alto Firewall"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Product Type *</label>
                  <select
                    value={productForm.product_type}
                    onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value })}
                    className="input-base"
                  >
                    {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Vendor</label>
                  <input
                    value={productForm.vendor}
                    onChange={(e) => setProductForm({ ...productForm, vendor: e.target.value })}
                    placeholder="e.g. Palo Alto Networks"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Serial Number</label>
                  <input
                    value={productForm.serial_number}
                    onChange={(e) => setProductForm({ ...productForm, serial_number: e.target.value })}
                    placeholder="e.g. PA-VM-123456"
                    className="input-base font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Technical Owner</label>
                  <input
                    value={productForm.technical_owner}
                    onChange={(e) => setProductForm({ ...productForm, technical_owner: e.target.value })}
                    placeholder="e.g. alice@acme.com"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Lifecycle State</label>
                  <select
                    value={productForm.lifecycle_state}
                    onChange={(e) => setProductForm({ ...productForm, lifecycle_state: e.target.value })}
                    className="input-base"
                  >
                    {LIFECYCLE_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Health Status</label>
                  <select
                    value={productForm.health_status}
                    onChange={(e) => setProductForm({ ...productForm, health_status: e.target.value })}
                    className="input-base"
                  >
                    {HEALTH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 block mb-1.5">Notes</label>
                  <textarea
                    value={productForm.notes}
                    onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                    rows={3}
                    className="input-base resize-none"
                  />
                </div>
              </div>
              {productFormError && <p className="mt-2 text-red-400 text-xs">{productFormError}</p>}
              <div className="mt-4">
                <button type="submit" disabled={productSaving} className="btn-primary text-xs disabled:opacity-50">
                  {productSaving ? "Creating…" : "Create Product"}
                </button>
              </div>
            </form>
          )}

          {products.length === 0 ? (
            <p className="text-gray-600 text-xs py-4 text-center">No products yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {products.map((p) => {
                const lc = LIFECYCLE[p.lifecycle_state] ?? LIFECYCLE.proposed;
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="card card-hover flex items-center gap-4 px-5 py-4 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {p.record_id}
                        <span className="mx-1.5 text-gray-700">·</span>{p.product_type}
                        {p.vendor && <><span className="mx-1.5 text-gray-700">·</span>{p.vendor}</>}
                        {p.serial_number && <><span className="mx-1.5 text-gray-700">·</span><span className="font-mono">S/N: {p.serial_number}</span></>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${lc.bg} ${lc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${lc.dot}`} />
                        {p.lifecycle_state}
                      </span>
                      <svg className="w-4 h-4 text-gray-700 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
