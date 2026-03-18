export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold tracking-tight">Dcore</h1>
      <p className="text-gray-400 text-lg">MSSP Service Delivery Platform</p>
      <div className="flex gap-3 mt-4">
        <a
          href="/clients"
          className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Clients
        </a>
        <a
          href="/products"
          className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          Products
        </a>
      </div>
    </main>
  );
}
