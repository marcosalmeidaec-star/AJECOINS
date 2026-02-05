import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc, deleteDoc,
  query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCsz2EP8IsTlG02uU2_GRfyQeeajMDuJjI",
  authDomain: "ajecoins-73829.firebaseapp.com",
  projectId: "ajecoins-73829",
  storageBucket: "ajecoins-73829.firebasestorage.app",
  messagingSenderId: "247461322350",
  appId: "1:247461322350:web:802185ad39249ca650507f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =================== VARIABLES DE CACHE PARA EXPORTAR =================== */
let cacheUsuarios = [];
let cacheCompras = [];
let cacheMovimientos = [];

/* =================== UTILIDADES CORREGIDAS =================== */
function normalizarFecha(fecha) {
  if (!fecha || typeof fecha !== "string" || fecha.trim() === "") return "2026-01-01";
  if (fecha.includes("-")) return fecha;
  const partes = fecha.split("/");
  if (partes.length < 3) return fecha;
  const [d, m, y] = partes;
  const dia = (d || "01").padStart(2, "0");
  const mes = (m || "01").padStart(2, "0");
  const anio = y || "2026";
  return `${anio}-${mes}-${dia}`;
}

function descargarCSV(nombre, filas) {
  const csv = filas.map(f => f.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
}

// Función para controlar el Loader visual (Ajustado a clase .active de styles.css)
function toggleLoader(show) {
  const loader = document.getElementById('loader');
  if (loader) {
    if (show) loader.classList.add('active'); // Muestra usando tu CSS
    else loader.classList.remove('active');   // Oculta
  }
}

/* =================== ELIMINAR USUARIO =================== */
window.eliminarUsuarioTotal = async (codVendedor) => {
  if (!confirm(`⚠️ ¿ELIMINAR acceso y coins del vendedor ${codVendedor}?`)) return;
  toggleLoader(true);
  try {
    await deleteDoc(doc(db, "credenciales", codVendedor));
    const snapCargas = await getDocs(query(collection(db, "usuariosPorFecha"), where("codVendedor", "==", codVendedor)));
    for (const d of snapCargas.docs) { await deleteDoc(doc(db, "usuariosPorFecha", d.id)); }
    alert(`Usuario ${codVendedor} eliminado.`);
    loadUsers();
  } catch (err) { 
    alert("Error al eliminar"); 
  } finally {
    toggleLoader(false);
  }
};

/* =================== CARGA CSV USUARIOS =================== */
document.getElementById("uploadBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Selecciona CSV");
  
  toggleLoader(true);
  try {
    const text = await file.text();
    const lines = text.trim().split("\n").slice(1).filter(line => line.trim() !== "");

    for (const line of lines) {
      const data = line.split(";").map(x => x.trim());
      if (data.length < 5) continue; 

      const [fechaRaw, codVendedor, nombre, cedis, coins] = data;
      if (!fechaRaw || !codVendedor) continue;
      
      const fechaNormal = normalizarFecha(fechaRaw);

      await setDoc(doc(db, "usuariosPorFecha", `${fechaNormal}_${codVendedor}`), {
        fecha: fechaNormal, 
        codVendedor, 
        nombre, 
        cedis, 
        coins_ganados: Number(String(coins).replace(/,/g, "")) || 0, // Limpieza de comas
        creado: Timestamp.now()
      }, { merge: true });
    }
    alert("Carga de usuarios completada");
    loadUsers();
  } catch (err) {
    alert("Error al procesar el archivo");
  } finally {
    toggleLoader(false);
  }
};

/* =================== TABLAS Y RENDERS =================== */
async function loadUsers() {
  const snap = await getDocs(collection(db, "usuariosPorFecha"));
  cacheUsuarios = [];
  snap.forEach(d => cacheUsuarios.push(d.data()));
  renderListaMaestra(cacheUsuarios);
  renderCargas(cacheUsuarios);
}

function renderListaMaestra(lista) {
  const maestraBody = document.getElementById("maestraBody");
  if (!maestraBody) return;
  maestraBody.innerHTML = "";
  const unicos = {};
  lista.forEach(u => { if(!unicos[u.codVendedor]) unicos[u.codVendedor] = u; });
  Object.values(unicos).forEach(u => {
    maestraBody.innerHTML += `<tr><td>${u.codVendedor}</td><td>${u.nombre}</td><td>${u.cedis}</td><td style="text-align:center;"><button class="btn-eliminar" onclick="eliminarUsuarioTotal('${u.codVendedor}')" style="width:auto; background:#d9534f;">Eliminar Todo</button></td></tr>`;
  });
}

function renderCargas(lista) {
  const usersBody = document.querySelector("#usersTable tbody");
  if (!usersBody) return;
  usersBody.innerHTML = "";
  lista.sort((a,b) => a.fecha.localeCompare(b.fecha)).forEach(u => {
    usersBody.innerHTML += `<tr><td>${u.fecha}</td><td>${u.codVendedor}</td><td>${u.nombre}</td><td style="text-align:center;">${u.coins_ganados}</td></tr>`;
  });
}

/* =================== EXPORTAR USUARIOS =================== */
document.getElementById("btnExportUsers").onclick = () => {
  if(!cacheUsuarios.length) return alert("No hay datos");
  const filas = [["Fecha", "Codigo Vendedor", "Nombre", "Cedis", "Coins"]];
  cacheUsuarios.forEach(u => filas.push([u.fecha, u.codVendedor, u.nombre, u.cedis, u.coins_ganados]));
  descargarCSV("reporte_usuarios.csv", filas);
};

/* =================== COMPRAS =================== */
async function loadCompras() {
  const snap = await getDocs(collection(db, "compras"));
  cacheCompras = [];
  snap.forEach(d => cacheCompras.push(d.data()));
  const body = document.querySelector("#comprasTable tbody");
  if (!body) return;
  body.innerHTML = "";
  cacheCompras.sort((a,b) => a.fecha.toMillis() - b.fecha.toMillis()).forEach(c => {
    body.innerHTML += `<tr><td>${c.fecha.toDate().toLocaleString()}</td><td>${c.codVendedor}</td><td>${c.nombre}</td><td>${c.items.map(i=>i.nombre).join(", ")}</td><td style="text-align:center;">${c.total}</td></tr>`;
  });
}

document.getElementById("btnExport").onclick = () => {
  if(!cacheCompras.length) return alert("No hay compras");
  const filas = [["Fecha", "Cod Vendedor", "Nombre", "Productos", "Total"]];
  cacheCompras.forEach(c => filas.push([c.fecha.toDate().toLocaleString(), c.codVendedor, c.nombre, c.items.map(i=>i.nombre).join(", "), c.total]));
  descargarCSV("reporte_compras.csv", filas);
};

/* =================== MOVIMIENTOS =================== */
document.getElementById("btnVerMov").onclick = async () => {
  const cod = document.getElementById("movCedula").value.trim();
  if(!cod) return alert("Escribe un código");
  toggleLoader(true);
  try {
    cacheMovimientos = await obtenerMovimientos(cod);
    renderMov(cacheMovimientos);
  } finally {
    toggleLoader(false);
  }
};

document.getElementById("btnVerTodosMov").onclick = async () => {
  toggleLoader(true);
  try {
    const snapUsers = await getDocs(collection(db, "usuariosPorFecha"));
    const todosLosCodigos = [...new Set(snapUsers.docs.map(d => d.data().codVendedor))];
    
    let totalMovs = [];
    for (const cod of todosLosCodigos) {
      const m = await obtenerMovimientos(cod);
      totalMovs = totalMovs.concat(m);
    }
    cacheMovimientos = totalMovs.sort((a,b) => new Date(a.fec) - new Date(b.fec));
    renderMov(cacheMovimientos);
  } finally {
    toggleLoader(false);
  }
};

async function obtenerMovimientos(cod) {
  let mov = []; let saldo = 0;
  const ing = await getDocs(query(collection(db, "usuariosPorFecha"), where("codVendedor", "==", cod)));
  ing.forEach(d => { const u = d.data(); mov.push({ cod: u.codVendedor, nom: u.nombre, fec: u.fecha, con: "Carga", cns: u.coins_ganados }); });
  const com = await getDocs(query(collection(db, "compras"), where("codVendedor", "==", cod)));
  com.forEach(d => { const c = d.data(); mov.push({ cod: c.codVendedor, nom: c.nombre, fec: c.fecha.toDate().toISOString().slice(0, 10), con: "Canje", cns: -c.total }); });
  mov.sort((a, b) => new Date(a.fec) - new Date(b.fec)).forEach(m => { saldo += m.cns; m.sld = saldo; });
  return mov;
}

function renderMov(lista) {
  const body = document.getElementById("movBody"); // ID ajustado para admin.html
  if (!body) return;
  body.innerHTML = lista.length ? lista.map(m => `<tr><td>${m.cod}</td><td>${m.nom}</td><td>${m.fec}</td><td>${m.con}</td><td style="color:${m.cns>=0?'green':'red'}; text-align:center;">${m.cns}</td><td style="text-align:center;">${m.sld}</td></tr>`).join('') : "<tr><td colspan='6'>No hay datos</td></tr>";
}

document.getElementById("btnExportMov").onclick = () => {
  if(!cacheMovimientos.length) return alert("No hay movimientos en pantalla");
  const filas = [["Codigo", "Nombre", "Fecha", "Concepto", "Coins", "Saldo"]];
  cacheMovimientos.forEach(m => filas.push([m.cod, m.nom, m.fec, m.con, m.cns, m.sld]));
  descargarCSV("reporte_movimientos.csv", filas);
};

/* =================== PRODUCTOS =================== */
document.getElementById("uploadProductBtn").onclick = async () => {
  const file = document.getElementById("productFileInput").files[0];
  if (!file) return;
  
  toggleLoader(true);
  try {
    const text = await file.text();
    const lines = text.trim().split("\n").slice(1).filter(l => l.trim() !== "");
    for (const line of lines) {
      const parts = line.replace(/"/g, "").split(";");
      if (parts.length < 2) continue;
      const [nombre, coins] = parts;
      
      const valorCoins = Number(String(coins).replace(/,/g, "")) || 0; // Limpieza de comas
      const nombreLimpio = nombre.trim();

      await setDoc(doc(db, "productos", nombreLimpio), { 
        producto: nombreLimpio, 
        coins: valorCoins 
      }, { merge: true });
    }
    alert("Inventario de productos actualizado");
    loadProducts();
  } catch (err) {
    alert("Error al cargar productos");
  } finally {
    toggleLoader(false);
  }
};

async function loadProducts() {
  const snap = await getDocs(collection(db, "productos"));
  const body = document.querySelector("#productsTable tbody");
  if (!body) return;
  body.innerHTML = "";
  snap.forEach(d => { 
    const p = d.data(); 
    body.innerHTML += `<tr><td>${p.producto}</td><td style="text-align:center;"><img src="assets/productos/${p.producto}.png" width="40" onerror="this.src='assets/logo.png'"></td><td style="text-align:center;">${p.coins}</td></tr>`;
  });
}

// Iniciar todo
loadUsers(); loadProducts(); loadCompras();
