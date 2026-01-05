(function() {
  const { useState, useEffect } = React;
  const { createRoot } = ReactDOM;

  function AdminPanel() {
    const [usuarios, setUsuarios] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🔹 Cargar usuarios desde Firestore
    const loadUsuarios = async () => {
      setLoading(true);
      try {
        const snapshot = await db.collection("usuarios").get();
        const data = snapshot.docs.map(doc => doc.data());
        setUsuarios(data);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
        alert("Error cargando usuarios desde Firebase");
      }
      setLoading(false);
    };

    // 🔹 Cargar productos desde Firestore
    const loadProductos = async () => {
      setLoading(true);
      try {
        const snapshot = await db.collection("productos").get();
        const data = snapshot.docs.map(doc => doc.data());
        setProductos(data);
      } catch (err) {
        console.error("Error cargando productos:", err);
        alert("Error cargando productos desde Firebase");
      }
      setLoading(false);
    };

    // 🔹 Efecto inicial
    useEffect(() => {
      loadUsuarios();
      loadProductos();
    }, []);

    // 🔹 Detectar separador CSV
    const detectSeparator = (text) => {
      const firstLine = text.split("\n")[0];
      if (firstLine.includes(";")) return ";";
      return ",";
    };

    // 🔹 Manejo de carga de archivo CSV flexible
    const handleFileUpload = async (e, tipo) => {
      const file = e.target.files[0];
      if (!file) return;
      setLoading(true);

      try {
        const text = await file.text();
        const separator = detectSeparator(text);
        const lines = text.split("\n").filter(l => l.trim());
        const headers = lines[0].split(separator).map(h => h.trim());

        if (tipo === "usuarios") {
          const data = lines.slice(1).map(line => {
            const values = line.split(separator);
            return {
              fecha: values[0]?.trim(),
              cedula: values[1]?.trim(),
              nombre: values[2]?.trim(),
              cedis: values[3]?.trim(),
              coins_ganados: parseInt(values[4]?.trim()) || 0
            };
          }).filter(u => u.cedula);

          const batch = db.batch();
          data.forEach(u => {
            const docRef = db.collection("usuarios").doc(u.cedula);
            batch.set(docRef, u);
          });
          await batch.commit();
          alert("✅ Usuarios cargados correctamente");
          loadUsuarios();

        } else if (tipo === "productos") {
          const data = lines.slice(1).map((line, index) => {
            const values = line.split(separator);
            return {
              id: `prod_${index+1}`,
              nombre: values[0]?.trim(),
              coins: parseInt(values[1]?.trim()) || 0
            };
          }).filter(p => p.nombre);

          const batch = db.batch();
          data.forEach(p => {
            const docRef = db.collection("productos").doc(p.id);
            batch.set(docRef, p);
          });
          await batch.commit();
          alert("✅ Productos cargados correctamente");
          loadProductos();
        }

      } catch (err) {
        console.error("Error procesando archivo:", err);
        alert("❌ Error al procesar el archivo. Verifica el formato CSV");
      }

      setLoading(false);
      e.target.value = ""; // reset input
    };

    return React.createElement("div", {className:"p-6"},
      React.createElement("h1", {className:"text-2xl font-bold text-green-800 mb-4"}, "AjeCoins Admin"),

      React.createElement("button", {onClick:()=>{loadUsuarios(); loadProductos();}, className:"bg-green-600 text-white px-4 py-2 rounded mb-4"}, "Actualizar"),

      loading ? React.createElement("p", {className:"text-green-700 mb-4"},"Cargando...") : null,

      // Cargar Usuarios
      React.createElement("div", {className:"mb-6"},
        React.createElement("label", {className:"flex items-center gap-2 cursor-pointer bg-green-50 px-4 py-2 rounded border border-green-300 hover:bg-green-100"},
          "Cargar Usuarios (CSV)",
          React.createElement("input", {type:"file", accept:".csv", onChange:(e)=>handleFileUpload(e,"usuarios"), className:"hidden"})
        )
      ),

      // Tabla de Usuarios
      React.createElement("h2",{className:"font-bold text-green-800 mb-2"},"Usuarios"),
      React.createElement("div",{className:"overflow-x-auto mb-6"},
        React.createElement("table",{className:"w-full border-collapse"},
          React.createElement("thead",{className:"bg-green-50"},
            React.createElement("tr",null,
              ["Fecha","Cédula","Nombre","CEDIS","Coins"].map(h =>
                React.createElement("th",{className:"px-4 py-2 text-green-800 font-semibold text-left"}, h)
              )
            )
          ),
          React.createElement("tbody",null,
            usuarios.map((u,i)=>
              React.createElement("tr",{key:i, className:"hover:bg-gray-50"},
                React.createElement("td",{className:"px-4 py-2"}, u.fecha),
                React.createElement("td",{className:"px-4 py-2 font-medium"}, u.cedula),
                React.createElement("td",{className:"px-4 py-2"}, u.nombre),
                React.createElement("td",{className:"px-4 py-2"}, u.cedis),
                React.createElement("td",{className:"px-4 py-2 text-green-600 font-semibold"}, u.coins_ganados)
              )
            )
          )
        )
      ),

      // Cargar Productos
      React.createElement("div", {className:"mb-6"},
        React.createElement("label", {className:"flex items-center gap-2 cursor-pointer bg-green-50 px-4 py-2 rounded border border-green-300 hover:bg-green-100"},
          "Cargar Productos (CSV)",
          React.createElement("input", {type:"file", accept:".csv", onChange:(e)=>handleFileUpload(e,"productos"), className:"hidden"})
        )
      ),

      // Tabla de Productos
      React.createElement("h2",{className:"font-bold text-green-800 mb-2"},"Productos"),
      React.createElement("div",{className:"overflow-x-auto"},
        React.createElement("table",{className:"w-full border-collapse"},
          React.createElement("thead",{className:"bg-green-50"},
            React.createElement("tr",null,
              ["Nombre","Coins"].map(h =>
                React.createElement("th",{className:"px-4 py-2 text-green-800 font-semibold text-left"}, h)
              )
            )
          ),
          React.createElement("tbody",null,
            productos.map((p,i)=>
              React.createElement("tr",{key:i, className:"hover:bg-gray-50"},
                React.createElement("td",{className:"px-4 py-2"}, p.nombre),
                React.createElement("td",{className:"px-4 py-2 text-green-600 font-semibold"}, p.coins)
              )
            )
          )
        )
      )
    );
  }

  const root = createRoot(document.getElementById("root"));
  root.render(React.createElement(AdminPanel));
})();
