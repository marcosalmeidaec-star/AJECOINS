import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js   ";
import {
  getFirestore, collection, getDocs, setDoc, doc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js   ";

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

// ----------- FUNCIONES AUXILIARES -----------
// Convierte "1/1/2025" → "2025-01-01"
function normalizarFecha(fecha) {
  const [d, m, y] = fecha.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// ----------- USUARIOS  (colección usuariosPorFecha) -----------
const fileInput   = document.getElementById("fileInput");
const uploadBtn   = document.getElementById("uploadBtn");
const usersBody   = document.querySelector("#usersTable tbody");
const filtroFecha = document.getElementById("filtroFecha");
const btnFiltrar  = document.getElementById("btnFiltrar");
const btnVerTodo  = document.getElementById("btnVerTodo");

// ----------- MOVIMIENTOS -----------
const movBody      = document.querySelector("#movTable tbody");
const btnVerMov    = document.getElementById("btnVerMov");
const btnExportMov = document.getElementById("btnExportMov");
const btnExportAll = document.getElementById("btnExportAllMov");
const movCedula    = document.getElementById("movCedula");

// ----------- PRODUCTOS -----------
const productFileInput = document.getElementById("productFileInput");
const uploadProductBtn = document.getElementById("uploadProductBtn");
const productsBody     = document.querySelector("#productsTable tbody");

// ----------- HISTORIAL -----------
const comprasBody = document.querySelector('#comprasTable tbody');
const btnExport   = document.getElementById('btnExport');

// ----------- MODAL -----------
const detalleDialog = document.getElementById('detalleDialog');
const detCedula     = document.getElementById('detCedula');
const detalleBody   = document.querySelector('#detalleTable tbody');
const cerrarDetalle = document.getElementById('cerrarDetalle');

// ---------- FUNCIONES ----------
function pintarTablaUsuarios(lista) {
  usersBody.innerHTML = lista
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.cedula.localeCompare(b.cedula))
    .map(u => `
      <tr>
        <td>${u.fecha}</td>
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td>${u.cedis}</td>
        <td>${u.coins_ganados}</td>
      </tr>`).join("");
}

async function loadUsers(fecha = null) {
  let q = collection(db, "usuariosPorFecha");
  if (fecha) q = query(q, where("fecha", "==", fecha));
  const snap = await getDocs(q);
  const usuarios = [];
  snap.forEach(d => usuarios.push(d.data()));
  pintarTablaUsuarios(usuarios);
}

async function loadProducts() {
  productsBody.innerHTML = "";
  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => {
    const p = d.data();
    productsBody.innerHTML += `
      <tr>
        <td>${p.producto}</td>
        <td><img src="assets/productos/${p.producto}.png" alt="${p.producto}" width="80" onerror="this.src='assets/productos/${p.producto}.jpg'"/></td>
        <td>${p.coins}</td>
      </tr>`;
  });
}

async function loadCompras(){
  comprasBody.innerHTML = '';
  const snap = await getDocs(collection(db, 'compras'));
  snap.forEach(d=>{
    const c = d.data();
    const fecha = c.fecha?.toDate().toLocaleString('es-EC') || '-';
    const productos = c.items.map(i=>i.nombre).join(', ');
    comprasBody.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${c.cedula}</td>
        <td>${c.nombre}</td>
        <td>${c.cedis}</td>
        <td>${productos}</td>
        <td>${c.total}</td>
      </tr>`;
  });
}

function exportarComprasCSV(){
  let csv = 'Fecha,Cedula,Nombre,Cedis,Productos,Total\n';
  const filas = Array.from(comprasBody.querySelectorAll('tr'));
  filas.forEach(r=>{
    const celdas = Array.from(r.querySelectorAll('td')).map(td=>td.textContent.replace(/,/g,' '));
    csv += celdas.join(',') + '\n';
  });
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'historial_compras.csv';
  link.click();
}

function exportarUsuariosCSV() {
  let csv = 'Fecha,Cedula,Nombre,Cedis,Coins_Ganados\n';
  const filas = Array.from(usersBody.querySelectorAll('tr'));
  filas.forEach(r => {
    const celdas = Array.from(r.querySelectorAll('td')).map(td =>
      td.textContent.replace(/,/g, ' ').trim()
    );
    csv += celdas.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'usuariosPorFecha.csv';
  link.click();
}

async function mostrarDebeHaber(cedula) {
  detCedula.textContent = cedula;
  detalleBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
  detalleDialog.showModal();

  const qUser = query(collection(db, 'usuariosPorFecha'), where('cedula', '==', cedula));
  const userSnap = await getDocs(qUser);
  const registros = [];
  userSnap.forEach(d => registros.push(d.data()));
  registros.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const qCompras = query(collection(db, 'compras'), where('cedula', '==', cedula));
  const comprasSnap = await getDocs(qCompras);
  const compras = [];
  comprasSnap.forEach(d => compras.push(d.data()));

  let html = '';
  for (const r of registros) {
    const ganados = r.coins_ganados;
    const desde = new Date(r.fecha);
    const canjeados = compras
      .filter(c => c.fecha.toDate() >= desde)
      .reduce((s, c) => s + c.total, 0);
    html += `
      <tr>
        <td>${r.fecha}</td>
        <td>${ganados}</td>
        <td>${canjeados}</td>
        <td>${ganados - canjeados}</td>
      </tr>`;
  }
  detalleBody.innerHTML = html;
}

// ----------- MOVIMIENTOS POR USUARIO (CRONOLÓGICO) -----------
async function cargarMovimientos(cedula) {
  if (!cedula) return alert("Escribe una cédula");
  movBody.innerHTML = "<tr><td colspan='5'>Cargando...</td></tr>";

  // 1. Ganancias (valor del archivo, sin tocar)
  const qGan = query(collection(db, "usuariosPorFecha"), where("cedula", "==", cedula));
  const ganSnap = await getDocs(qGan);
  const movs = [];
  let totalGanado = 0;
  ganSnap.forEach(d => {
    const g = d.data();
    totalGanado += g.coins_ganados;
    movs.push({
      fecha: g.fecha,
      concepto: "Ganado por archivo",
      coins: g.coins_ganados,
      signo: 1
    });
  });

  // 2. Canjes (resta una sola vez, por fecha real)
  const qCan = query(collection(db, "compras"), where("cedula", "==", cedula));
  const canSnap = await getDocs(qCan);
  canSnap.forEach(d => {
    const c = d.data();
    const productos = c.items.map(i => i.nombre).join(", ");
    movs.push({
      fecha: c.fecha.toDate().toISOString().slice(0,10),
      concepto: `Canje: ${productos}`,
      coins: c.total,
      signo: -1
    });
  });

  // 3. Ordenar y calcular saldo
  movs.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  let saldo = 0;
  let html = "";
  for (const m of movs) {
    saldo += m.coins * m.signo;
    html += `
      <tr>
        <td>${cedula}</td>
        <td>${m.fecha}</td>
        <td>${m.concepto}</td>
        <td>${m.signo === 1 ? "+" : "-"}${m.coins}</td>
        <td>${saldo}</td>
      </tr>`;
  }
  movBody.innerHTML = html;
}

async function cargarMovimientosTodos() {
  movBody.innerHTML = "<tr><td colspan='5'>Cargando TODOS...</td></tr>";

  // 1. TODAS las ganancias
  const ganSnap = await getDocs(collection(db, "usuariosPorFecha"));
  const movs = [];
  ganSnap.forEach(d => {
    const g = d.data();
    movs.push({
      cedula: g.cedula,
      fecha: g.fecha,
      concepto: "Ganado por archivo",
      coins: g.coins_ganados,
      signo: 1
    });
  });

  // 2. TODOS los canjes
  const canSnap = await getDocs(collection(db, "compras"));
  canSnap.forEach(d => {
    const c = d.data();
    const productos = c.items.map(i => i.nombre).join(", ");
    movs.push({
      cedula: c.cedula,
      fecha: c.fecha.toDate().toISOString().slice(0,10),
      concepto: `Canje: ${productos}`,
      coins: c.total,
      signo: -1
    );
  });

  // 3. Ordenar y mostrar
  movs.sort((a, b) => a.cedula.localeCompare(b.cedula) || new Date(a.fecha) - new Date(b.fecha));
  let html = "";
  for (const m of movs) {
    html += `
      <tr>
        <td>${m.cedula}</td>
        <td>${m.fecha}</td>
        <td>${m.concepto}</td>
        <td>${m.signo === 1 ? "+" : "-"}${m.coins}</td>
        <td></td>
      </tr>`;
  }
  movBody.innerHTML = html;
}

function exportarMovCSV() {
  const filas = Array.from(movBody.querySelectorAll('tr'));
  if (filas.length === 0) return alert("No hay datos para exportar");
  let csv = 'Cedula,Fecha,Concepto,Coins\n';
  filas.forEach(r => {
    const celdas = Array.from(r.querySelectorAll('td')).map(td =>
      td.textContent.replace(/,/g, ' ').trim()
    );
    csv += celdas.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `movimientos_${movCedula.value.trim() || "todos"}.csv`;
  link.click();
}

// ---------- EVENTOS ----------
btnVerMov.addEventListener("click", () => cargarMovimientos(movCedula.value.trim()));
btnExportMov.addEventListener("click", exportarMovCSV);
btnExportAll.addEventListener("click", () => {
  cargarMovimientosTodos();
  setTimeout(() => {
    movCedula.value = "todos";
    exportarMovCSV();
  }, 500);
});

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona el CSV de usuarios");
  const text  = await file.text();
  const lines = text.trim().split("\n").slice(1);
  const fechasEnArchivo = new Set();
  for (const line of lines) {
    const p = line.trim().split(";");
    if (p.length >= 5 && p[0].trim() && p[1].trim()) fechasEnArchivo.add(p[0].trim());
  }
  if (fechasEnArchivo.size === 0) {
    alert("No hay registros válidos (asegúrate de 5 columnas con fecha y cédula)");
    return;
  }
  for (const fecha of fechasEnArchivo) {
    const fechaNormalizada = normalizarFecha(fecha);
    const q = query(collection(db, "usuariosPorFecha"), where("fecha", "==", fechaNormalizada));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, "usuariosPorFecha", docSnap.id));
    }
  }
  const subidos = [];
  for (const line of lines) {
    const parts = line.trim().split(";");
    if (parts.length < 5 || parts[0].trim() === "" || parts[1].trim() === "") continue;
    const [fechaRaw, cedula, nombre, cedis, coins_ganados] = parts.map(x => x.trim());
    const fecha = normalizarFecha(fechaRaw);
    const docId = `${fecha}_${cedula}`;
    const reg = {
      fecha,
      cedula,
      nombre,
      cedis,
      coins_ganados: parseInt(coins_ganados, 10)
    };
    await setDoc(doc(db, "usuariosPorFecha", docId), reg);
    subidos.push(reg);
  }
  pintarTablaUsuarios(subidos);
  alert(`Archivo procesado: ${subidos.length} registros (${fechasEnArchivo.size} fechas)`);
});

btnFiltrar.addEventListener("click", () => {
  const fecha = filtroFecha.value;
  if (!fecha) return alert("Selecciona una fecha");
  loadUsers(fecha);
});

btnVerTodo.addEventListener("click", () => {
  filtroFecha.value = "";
  loadUsers();
});

btnExport.addEventListener('click', exportarComprasCSV);
cerrarDetalle.addEventListener('click', () => detalleDialog.close());

usersBody.addEventListener('click', async e => {
  const fila = e.target.closest('tr');
  if (!fila) return;
  const cedula = fila.cells[1].textContent.trim();
  mostrarDebeHaber(cedula);
});

uploadProductBtn.addEventListener("click", loadProducts);

// ---------- INICIAL ----------
loadProducts();
loadUsers();
loadCompras();
