import React, { useState, useEffect } from "https://cdn.skypack.dev/react";
import { createRoot } from "https://cdn.skypack.dev/react-dom/client";
const { Upload, Users, Package, ArrowDownToLine, Calendar, RefreshCw } = window.lucide;

function AdminPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [canjes, setCanjes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos desde Firestore
  const loadData = async () => {
    setLoading(true);
    try {
      const usuariosSnap = await getDocs(collection(window.db, "usuarios"));
      setUsuarios(usuariosSnap.docs.map(d => d.data()));

      const productosSnap = await getDocs(collection(window.db, "productos"));
      setProductos(productosSnap.docs.map(d => d.data()));

      const canjesSnap = await getDocs(collection(window.db, "canjes"));
      setCanjes(canjesSnap.docs.map(d => d.data()));
    } catch (err) {
      console.error(err);
      alert("Error cargando datos de Firebase");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-4">AjeCoins Admin</h1>
      <button onClick={loadData} className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2">
        <RefreshCw size={18}/> Actualizar
      </button>

      <h2 className="mt-6 font-semibold text-green-700">Usuarios:</h2>
      <ul className="list-disc pl-6">
        {usuarios.map((u, i) => <li key={i}>{u.nombre} ({u.coins_ganados} coins)</li>)}
      </ul>

      <h2 className="mt-6 font-semibold text-green-700">Productos:</h2>
      <ul className="list-disc pl-6">
        {productos.map((p, i) => <li key={i}>{p.nombre} - {p.coins} coins</li>)}
      </ul>

      <h2 className="mt-6 font-semibold text-green-700">Canjes:</h2>
      <ul className="list-disc pl-6">
        {canjes.map((c, i) => (
          <li key={i}>{c.nombre} canjeó {c.producto} (-{c.coins_gastados} coins) el {c.fecha_solicitud}</li>
        ))}
      </ul>
    </div>
  );
}

// Render
const root = createRoot(document.getElementById("root"));
root.render(<AdminPanel />);
