"use client";

import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { clientsApi, environmentsApi, productsApi, Client, Environment, Product } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

const LIFECYCLE_STATES = ["proposed", "design", "approved", "build", "deployment", "operational", "maintenance", "at_risk", "retiring", "retired"];
const HEALTH_STATUSES = ["healthy", "degraded", "at_risk", "unsupported"];
const PRODUCT_TYPES = ["Security", "Application", "Integration", "API", "Analytics", "Infrastructure", "Other"];

const emptyProductForm = {
  record_id: "",
  name: "",
  environment_id: "",
  product_type: "Security",
  vendor: "",
  lifecycle_state: "proposed",
  health_status: "healthy",
  technical_owner: "",
  notes: "",
};

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

  if (loading) return <AppLayout><p className="text-gray-400 text-sm animate-pulse">Loading...</p></AppLayout>;
  if (!client) return <AppLayout><p className="text-red-400 text-sm">Client not found.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">

        {/* Client header */}
        <div className="mb-6">
          <Link href="/clients" className="text-gray-500 text-sm hover:text-gray-300">← Clients</Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {!editingClient && (
              <button
                onClick={handleEditClient}
                className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:border-gray-500 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-gray-500 text-sm">{client.code} {client.sla_tier ? `· SLA: ${client.sla_tier}` : ""}</p>
        </div>

        {/* Client edit form / info grid */}
        {editingClient ? (
          <form onSubmit={handleSaveClient} className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-8 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Name *</label>
              <input
                required value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">SLA Tier</label>
              <input
                value={clientForm.sla_tier}
                onChange={(e) => setClientForm({ ...clientForm, sla_tier: e.target.value })}
                placeholder="e.g. Platinum"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Primary Contact</label>
              <input
                value={clientForm.primary_contact}
                onChange={(e) => setClientForm({ ...clientForm, primary_contact: e.target.value })}
                placeholder="e.g. cto@acme.com"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Business Context</label>
              <textarea
                value={clientForm.business_context}
                onChange={(e) => setClientForm({ ...clientForm, business_context: e.target.value })}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Critical Services</label>
              <textarea
                value={clientForm.critical_services}
                onChange={(e) => setClientForm({ ...clientForm, critical_services: e.target.value })}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Escalation Path</label>
              <textarea
                value={clientForm.escalation_path}
                onChange={(e) => setClientForm({ ...clientForm, escalation_path: e.target.value })}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            {clientError && <p className="col-span-2 text-red-400 text-xs">{clientError}</p>}
            <div className="col-span-2 flex gap-3">
              <button
                type="submit" disabled={clientSaving}
                className="px-5 py-2 bg-green-800 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
              >
                {clientSaving ? "Saving…" : "Save Client"}
              </button>
              <button
                type="button"
                onClick={() => setEditingClient(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {client.business_context && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Business Context</p>
                <p className="text-sm text-gray-200">{client.business_context}</p>
              </div>
            )}
            {client.primary_contact && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Primary Contact</p>
                <p className="text-sm text-gray-200">{client.primary_contact}</p>
              </div>
            )}
          </div>
        )}

        {/* Environments section */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Environments</h2>
          <button
            onClick={() => { setShowEnvForm(!showEnvForm); setEnvFormError(""); }}
            className="text-sm px-4 py-2 bg-indigo-800 hover:bg-indigo-700 text-white rounded"
          >
            {showEnvForm ? "Cancel" : "+ Add Environment"}
          </button>
        </div>

        {showEnvForm && (
          <form
            onSubmit={handleAddEnvironment}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4 grid grid-cols-2 gap-4"
          >
            <div>
              <label className="text-xs text-gray-400 block mb-1">Name *</label>
              <input
                required value={envForm.name}
                onChange={(e) => setEnvForm({ ...envForm, name: e.target.value })}
                placeholder="e.g. Production"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Description</label>
              <input
                value={envForm.description}
                onChange={(e) => setEnvForm({ ...envForm, description: e.target.value })}
                placeholder="e.g. Live production environment"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            {envFormError && <p className="col-span-2 text-red-400 text-xs">{envFormError}</p>}
            <div className="col-span-2">
              <button
                type="submit" disabled={envSaving}
                className="px-5 py-2 bg-indigo-800 hover:bg-indigo-700 text-white text-sm rounded disabled:opacity-50"
              >
                {envSaving ? "Creating…" : "Create Environment"}
              </button>
            </div>
          </form>
        )}

        {environments.length === 0 ? (
          <p className="text-gray-500 text-sm mb-8">No environments yet — add one above before creating products.</p>
        ) : (
          <div className="flex flex-col gap-2 mb-8">
            {environments.map((env) => (
              <div key={env.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{env.name}</p>
                  {env.description && <p className="text-xs text-gray-500 mt-0.5">{env.description}</p>}
                </div>
                <span className="text-xs text-gray-600">{env.id.slice(0, 8)}…</span>
              </div>
            ))}
          </div>
        )}

        {/* Products section */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Products</h2>
          {environments.length > 0 && (
            <button
              onClick={() => { setShowProductForm(!showProductForm); setProductFormError(""); }}
              className="text-sm px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded"
            >
              {showProductForm ? "Cancel" : "+ Add Product"}
            </button>
          )}
        </div>

        {environments.length === 0 && (
          <p className="text-gray-500 text-sm mb-4">Add an environment above to enable product creation.</p>
        )}

        {showProductForm && (
          <form
            onSubmit={handleAddProduct}
            className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-5 grid grid-cols-2 gap-4"
          >
            <div>
              <label className="text-xs text-gray-400 block mb-1">Environment *</label>
              <select
                required value={productForm.environment_id}
                onChange={(e) => handleEnvChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="">Select environment…</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Record ID (auto-generated · editable) *
                {recordIdLoading && <span className="ml-2 text-gray-500 italic">generating…</span>}
              </label>
              <input
                required value={productForm.record_id}
                onChange={(e) => setProductForm({ ...productForm, record_id: e.target.value })}
                placeholder="Select an environment first"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Name *</label>
              <input
                required value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. Palo Alto Firewall"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Product Type *</label>
              <select
                value={productForm.product_type}
                onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Vendor</label>
              <input
                value={productForm.vendor}
                onChange={(e) => setProductForm({ ...productForm, vendor: e.target.value })}
                placeholder="e.g. Palo Alto Networks"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Technical Owner</label>
              <input
                value={productForm.technical_owner}
                onChange={(e) => setProductForm({ ...productForm, technical_owner: e.target.value })}
                placeholder="e.g. alice@acme.com"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Lifecycle State</label>
              <select
                value={productForm.lifecycle_state}
                onChange={(e) => setProductForm({ ...productForm, lifecycle_state: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                {LIFECYCLE_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Health Status</label>
              <select
                value={productForm.health_status}
                onChange={(e) => setProductForm({ ...productForm, health_status: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                {HEALTH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <textarea
                value={productForm.notes}
                onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            {productFormError && <p className="col-span-2 text-red-400 text-xs">{productFormError}</p>}
            <div className="col-span-2">
              <button
                type="submit" disabled={productSaving}
                className="px-5 py-2 bg-green-800 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
              >
                {productSaving ? "Creating…" : "Create Product"}
              </button>
            </div>
          </form>
        )}

        {products.length === 0 ? (
          <p className="text-gray-500 text-sm">No products yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-gray-600 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.record_id} · {p.product_type} · {p.vendor ?? "—"}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${LIFECYCLE_COLORS[p.lifecycle_state] ?? "bg-gray-700 text-gray-300"}`}>
                  {p.lifecycle_state}
                </span>
              </Link>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
