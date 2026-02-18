import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc, deleteDoc,
  query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// NUEVAS CREDENCIALES AJECOINS26
const firebaseConfig = {
  apiKey: "AIzaSyAmfn78n85qiOzmu-u9nwsPiOlXXFDYwcU",
  authDomain: "ajecoins26-3d123.firebaseapp.com",
  projectId: "ajecoins26-3d123",
  storageBucket: "ajecoins26-3d123.firebasestorage.app",
  messagingSenderId: "377488479071",
  appId: "1:377488479071:web:3ea4c4c9a6b2380e375cea",
  measurementId: "G-C7CW2P54ZY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =================== VARIABLES DE CACHE =================== */
let cacheUsuarios = [];
let cacheCompras = [];
let cacheMovimientos = [];

/* =================== UTILIDADES =================== */
function normalizarFecha(fecha) {
  if (fecha.includes("-")) return fecha;
  const [d, m, y] = fecha.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
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

/* =================== CARGA CSV =================== */
document.getElementById("uploadBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Selecciona CSV");
  const text = await file.text();
  const lines = text.trim().split("\n").slice(1);
  for (const line of lines) {
    const [fechaRaw, codVendedor, nombre, cedis, coins] = line.split(";").map(x => x.trim());
    if (!fechaRaw || !codVendedor) continue;
    await setDoc(doc(db, "usuariosPorFecha", `${normalizarFecha(fechaRaw)}_${codVendedor}`), {
      fecha: normalizarFecha(fechaRaw), codVendedor, nombre, cedis, coins_ganados: Number(coins), creado: Timestamp.now()
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
  renderCargas(cacheUsuarios);
}

function renderCargas(lista) {
  const usersBody = document.querySelector("#usersTable tbody");
  usersBody.innerHTML = "";
  lista.sort((a,b) => a.fecha.localeCompare(b.fecha)).forEach(u => {
    // AJUSTE: Se añade columna de CEDIS para que coincida con el HTML
    usersBody.innerHTML += `<tr><td>${u.fecha}</td><td>${u.codVendedor}</td><td>${u.nombre}</td><td>${u.cedis}</td><td>${u.coins_ganados}</td></tr>`;
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
    body.innerHTML += `<tr><td>${c.fecha.toDate().toLocaleString()}</td><td>${c.codVendedor}</td><td>${c.nombre}</td><td>${c.cedis}</td><td>${c.items.map(i=>i.nombre).join(", ")}</td><td>${c.total}</td></tr>`;
  });
}

document.getElementById("btnExport").onclick = () => {
  if(!cacheCompras.length) return alert("No hay compras");
  const filas = [["Fecha", "Cod Vendedor", "Nombre", "Cedis", "Productos", "Total"]];
  cacheCompras.forEach(c => filas.push([c.fecha.toDate().toLocaleString(), c.codVendedor, c.nombre, c.cedis, c.items.map(i=>i.nombre).join(", "), c.total]));
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
  ing.forEach(d => { const u = d.data(); mov.push({ cod: u.codVendedor, nom: u.nombre, ced: u.cedis, fec: u.fecha, con: "Carga", cns: u.coins_ganados }); });
  const com = await getDocs(query(collection(db, "compras"), where("codVendedor", "==", cod)));
  com.forEach(d => { const c = d.data(); mov.push({ cod: c.codVendedor, nom: c.nombre, ced: c.cedis, fec: c.fecha.toDate().toISOString().slice(0, 10), con: "Canje", cns: -c.total }); });
  mov.sort((a, b) => new Date(a.fec) - new Date(b.fec)).forEach(m => { saldo += m.cns; m.sld = saldo; });
  return mov;
}

function renderMov(lista) {
  const body = document.querySelector("#movTable tbody");
  body.innerHTML = lista.length ? lista.map(m => `<tr><td>${m.cod}</td><td>${m.nom}</td><td>${m.ced}</td><td>${m.fec}</td><td>${m.con}</td><td style="color:${m.cns>=0?'green':'red'}">${m.cns}</td><td>${m.sld}</td></tr>`).join('') : "<tr><td colspan='7'>No hay datos</td></tr>";
}

document.getElementById("btnExportMov").onclick = () => {
  if(!cacheMovimientos.length) return alert("No hay movimientos en pantalla");
  const filas = [["Codigo", "Nombre", "Cedis", "Fecha", "Concepto", "Coins", "Saldo"]];
  cacheMovimientos.forEach(m => filas.push([m.cod, m.nom, m.ced, m.fec, m.con, m.cns, m.sld]));
  descargarCSV("reporte_movimientos.csv", filas);
};

/* =================== PRODUCTOS =================== */
document.getElementById("uploadProductBtn").onclick = async () => {
  const file = document.getElementById("productFileInput").files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text.trim().split("\n").slice(1);
  for (const line of lines) {
    const [nombre, coins] = line.replace(/"/g, "").split(";");
    await setDoc(doc(db, "productos", nombre.trim()), { producto: nombre.trim(), coins: Number(coins) });
  }
  loadProducts();
};

async function loadProducts() {
  const snap = await getDocs(collection(db, "productos"));
  const body = document.querySelector("#productsTable tbody");
  body.innerHTML = "";
  snap.forEach(d => { const p = d.data(); body.innerHTML += `<tr><td>${p.producto}</td><td><img src="assets/productos/${p.producto}.png" width="40"></td><td>${p.coins}</td></tr>`; });
}

loadUsers(); loadProducts(); loadCompras();
