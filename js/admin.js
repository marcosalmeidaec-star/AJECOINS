// =======================
// Helper: parse CSV simple
// =======================
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines.shift().split(/\s*[,;]\s*/);
  return lines.map(line => {
    const values = line.split(/\s*[,;]\s*/);
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i].trim());
    return obj;
  });
}

// =======================
// USUARIOS
// =======================
const fileUsuarios = document.getElementById("fileUsuarios");
const uploadUsuarios = document.getElementById("uploadUsuarios");
const statusUsuarios = document.getElementById("statusUsuarios");
const listaUsuarios = document.getElementById("listaUsuarios");

uploadUsuarios.addEventListener("click", async () => {
  const file = fileUsuarios.files[0];
  if (!file) return alert("Selecciona un archivo CSV de usuarios.");
  statusUsuarios.textContent = "Cargando usuarios...";
  const text = await file.text();
  const data = parseCSV(text);

  for (const u of data) {
    await db.collection("usuarios").doc(u.cedula).set(u);
  }

  statusUsuarios.textContent = `Usuarios subidos: ${data.length}`;
  mostrarUsuarios();
});

async function mostrarUsuarios() {
  const snapshot = await db.collection("usuarios").get();
  listaUsuarios.innerHTML = `<p>Total: ${snapshot.size} usuarios</p>` +
    snapshot.docs.map(d => JSON.stringify(d.data())).join("<br>");
}

// =======================
// PRODUCTOS
// =======================
const fileProductos = document.getElementById("fileProductos");
const uploadProductos = document.getElementById("uploadProductos");
const statusProductos = document.getElementById("statusProductos");
const listaProductos = document.getElementById("listaProductos");

uploadProductos.addEventListener("click", async () => {
  const file = fileProductos.files[0];
  if (!file) return alert("Selecciona un archivo CSV de productos.");
  statusProductos.textContent = "Cargando productos...";
  const text = await file.text();
  const data = parseCSV(text);

  for (const p of data) {
    await db.collection("productos").doc(p.productos).set(p);
  }

  statusProductos.textContent = `Productos subidos: ${data.length}`;
  mostrarProductos();
});

async function mostrarProductos() {
  const snapshot = await db.collection("productos").get();
  listaProductos.innerHTML = `<p>Total: ${snapshot.size} productos</p>` +
    snapshot.docs.map(d => JSON.stringify(d.data())).join("<br>");
}

// =======================
// HISTORIAL CANJES
// =======================
const listaCanjes = document.getElementById("listaCanjes");
const filtroFecha = document.getElementById("filtroFecha");
const filtrarCanjes = document.getElementById("filtrarCanjes");
const descargarCanjes = document.getElementById("descargarCanjes");

async function mostrarCanjes(fecha) {
  const snapshot = await db.collection("canjes").get();
  let data = snapshot.docs.map(d => d.data());
  if (fecha) data = data.filter(c => c.fecha === fecha);
  listaCanjes.innerHTML = data.map(d => JSON.stringify(d)).join("<br>");
}

filtrarCanjes.addEventListener("click", () => {
  mostrarCanjes(filtroFecha.value);
});

descargarCanjes.addEventListener("click", () => {
  db.collection("canjes").get().then(snapshot => {
    const rows = snapshot.docs.map(d => d.data());
    if (rows.length === 0) return alert("No hay datos para descargar.");
    const headers = Object.keys(rows[0]);
    let csv = [headers.join(",")].concat(rows.map(r => headers.map(h => r[h]).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "canjes.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
});

// =======================
// Mostrar inicial
// =======================
mostrarUsuarios();
mostrarProductos();
mostrarCanjes();
