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
  // Protección: Si la fecha es nula, vacía o no es texto, evitar error de padStart
  if (!fecha || typeof fecha !== "string" || fecha.trim() === "") return "2026-01-01";
  
  if (fecha.includes("-")) return fecha;
  
  const partes = fecha.split("/");
  // Si no tiene el formato D/M/Y esperado, devolvemos el valor original para evitar romper el flujo
  if (partes.length < 3) return fecha;

  const [d, m, y] = partes;
  // Aplicamos padStart solo asegurando que d y m existan
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

/* =================== ELIMINAR USUARIO =================== */
window.eliminarUsuarioTotal = async (codVendedor) => {
  if (!confirm(`⚠️ ¿ELIMINAR acceso y coins del vendedor ${codVendedor}?`)) return;
  try {
    await deleteDoc(doc(db, "credenciales", codVendedor));
    const snapCargas = await getDocs(query(collection(db, "usuariosPorFecha"), where("codVendedor", "==", codVendedor)));
    for (const d of snapCargas.docs) { await deleteDoc(doc(db, "usuariosPorFecha", d.id)); }
    alert(`Usuario ${codVendedor} eliminado.`);
    loadUsers();
  } catch (err) { alert("Error al eliminar"); }
};

/* =================== CARGA CSV (LÓGICA BLINDADA) =================== */
document.getElementById("uploadBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Selecciona CSV");
  const text = await file.text();
  
  // .filter(l => l.trim() !== "") elimina filas vacías al final que causan el error de padStart
  const lines = text.trim().split("\n").slice(1).filter(line => line.trim() !== "");

  for (const line of lines) {
    const data = line.split(";").map(x => x.trim());
    if (data.length < 5) continue; // Salta líneas incompletas para evitar errores

    const [fechaRaw, codVendedor, nombre, cedis, coins] = data;
    if (!fechaRaw || !codVendedor) continue;
    
    const fechaNormal = normalizarFecha(fechaRaw);

    await setDoc(doc(db, "usuariosPorFecha", `${fechaNormal}_${codVendedor}`), {
      fecha: fechaNormal, 
      codVendedor, 
      nombre, 
      cedis, 
      coins_ganados: Number(coins) || 0, 
      creado: Timestamp.now()
    }, { merge: true });
  }
  alert("Carga completada");
  loadUsers();
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
  maestraBody.innerHTML = "";
  const unicos = {};
  lista.forEach(u => { if(!unicos[u.codVendedor]) unicos[u.codVendedor] = u; });
  Object.values(unicos).forEach(u => {
    maestraBody.innerHTML += `<tr><td>${u.codVendedor}</td><td>${u.nombre}</td><td>${u.cedis}</td><td><button class="btn-eliminar" onclick="eliminarUsuarioTotal('${u.codVendedor}')">Eliminar Todo</button></td></tr>`;
  });
}

function renderCargas(lista) {
  const usersBody = document.querySelector("#usersTable tbody");
  usersBody.innerHTML = "";
  lista.sort((a,b) => a.fecha.localeCompare(b.fecha)).forEach(u => {
    usersBody.innerHTML += `<tr><td>${u.fecha}</td><td>${u.codVendedor}</td><td>${u.nombre}</td><td>${u.coins_ganados}</td></tr>`;
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
  body.innerHTML = "";
  cacheCompras.sort((a,b) => a.fecha.toMillis() - b.fecha.toMillis()).forEach(c => {
    body.innerHTML += `<tr><td>${c.fecha.toDate().toLocaleString()}</td><td>${c.codVendedor}</td><td>${c.nombre}</td><td>${c.items.map(i=>i.nombre).join(", ")}</td><td>${c.total}</td></tr>`;
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
  cacheMovimientos = await obtenerMovimientos(cod);
  renderMov(cacheMovimientos);
};

document.getElementById("btnVerTodosMov").onclick = async () => {
  const snapUsers = await getDocs(collection(db, "usuariosPorFecha"));
  const todosLosCodigos = [...new Set(snapUsers.docs.map(d => d.data().codVendedor))];
  
  let totalMovs = [];
  for (const cod of todosLosCodigos) {
    const m = await obtenerMovimientos(cod);
    totalMovs = totalMovs.concat(m);
  }
  cacheMovimientos = totalMovs.sort((a,b) => new Date(a.fec) - new Date(b.fec));
  renderMov(cacheMovimientos);
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
  const body = document.querySelector("#movTable tbody");
  body.innerHTML = lista.length ? lista.map(m => `<tr><td>${m.cod}</td><td>${m.nom}</td><td>${m.fec}</td><td>${m.con}</td><td style="color:${m.cns>=0?'green':'red'}">${m.cns}</td><td>${m.sld}</td></tr>`).join('') : "<tr><td colspan='6'>No hay datos</td></tr>";
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
  const text = await file.text();
  const lines = text.trim().split("\n").slice(1).filter(l => l.trim() !== "");
  for (const line of lines) {
    const parts = line.replace(/"/g, "").split(";");
    if (parts.length < 2) continue;
    const [nombre, coins] = parts;
    await setDoc(doc(db, "productos", nombre.trim()), { producto: nombre.trim(), coins: Number(coins) || 0 });
  }
  loadProducts();
};

async function loadProducts() {
  const snap = await getDocs(collection(db, "productos"));
  const body = document.querySelector("#productsTable tbody");
  body.innerHTML = "";
  snap.forEach(d => { 
    const p = d.data(); 
    body.innerHTML += `<tr><td>${p.producto}</td><td><img src="assets/productos/${p.producto}.png" width="40"></td><td>${p.coins}</td></tr>`;
  });
}

// Iniciar todo
loadUsers(); loadProducts(); loadCompras();
