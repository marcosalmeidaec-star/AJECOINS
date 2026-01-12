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

// ----------- PRODUCTOS -----------
const productFileInput = document.getElementById("productFileInput");
const uploadProductBtn = document.getElementById("uploadProductBtn");
const productsBody     = document.querySelector("#productsTable tbody");

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

// ----------- HISTORIAL -----------
const comprasBody = document.querySelector('#comprasTable tbody');
const btnExport   = document.getElementById('btnExport');

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

// ----------- MODAL DETALLE POR FECHA -----------
const detalleDialog = document.getElementById('detalleDialog');
const detCedula     = document.getElementById('detCedula');
const detalleBody   = document.querySelector('#detalleTable tbody');
const cerrarDetalle = document.getElementById('cerrarDetalle');

async function mostrarDebeHaber(cedula) {
  detCedula.textContent = cedula;
  detalleBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
  detalleDialog.showModal();

  // 1. Solo valores del archivo (sin restar)
  const qUser = query(collection(db, 'usuariosPorFecha'), where('cedula', '==', cedula));
  const userSnap = await getDocs(qUser);
  const registros = [];
  userSnap.forEach(d => registros.push(d.data()));
  registros.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let html = '';
  for (const r of registros) {
    html += `
      <tr>
        <td>${r.fecha}</td>
        <td>${r.coins_ganados}</td>
        <td>-</td>
        <td>${r.coins_ganados}</td>
      </tr>`;
  }
  detalleBody.innerHTML = html;
}

// ----------- MOVIMIENTOS POR USUARIO (EVOLUTIVO) -----------
const movBody      = document.querySelector("#movTable tbody");
const btnVerMov    = document.getElementById("btnVerMov");
const btnExportMov = document.getElementById("btnExportMov");
const btnExportAll = document.getElementById("btnExportAllMov");
const movCedula    = document.getElementById("movCedula");

// Si los botones no existen, los creamos dinámicamente
if (!btnVerMov) {
  const section = document.querySelector("section:last-of-type");
  section.insertAdjacentHTML('afterend', `
    <section>
      <h2>Movimientos por usuario</h2>
      <label>Cédula: <input type="text" id="movCedula" placeholder="932064983" /></label>
      <button id="btnVerMov">Ver movimientos</button>
      <button id="btnExportMov" class="btn btn-secondary">Exportar esta cédula</button>
      <button id="btnExportAllMov" class="btn btn-secondary">Exportar TODOS</button>
      <table id="movTable"><thead><tr><th>Cédula</th><th>Fecha</th><th>Concepto</th><th>Coins</th><th>Saldo</th></tr></thead><tbody></tbody></table>
    </section>
  `);
  // Reasignar variables tras crear dinámicamente
  window.movBody      = document.querySelector("#movTable tbody");
  window.btnVerMov    = document.getElementById("btnVerMov");
  window.btnExportMov = document.getElementById("btnExportMov");
  window.btnExportAll = document.getElementById("btnExportAllMov");
  window.movCedula    = document.getElementById("movCedula");
}

async function cargarMovimientos(cedula) {
  if (!cedula) return alert("Escribe una cédula");
  movBody.innerHTML = "<tr><td colspan='5'>Cargando...</td></tr>";

  // 1. Ganancias (sin tocar el valor del archivo)
  const qGan = query(collection(db, "usuariosPorFecha"), where("cedula", "==", cedula));
  const ganSnap = await getDocs(qGan);
  const movs = [];
  let totalGanado = 0;
  ganSnap.forEach(d => {
    const g = d.data();
    totalGanado += g.coins_ganados;
    movs.push({
      cedula: cedula,
      fecha: g.fecha,
      concepto: "Ganado por archivo",
      coins: g.coins_ganados,
      signo: 1
    });
  });

  // 2. Canjes (resta aparte, sin modificar el original)
  const qCan = query(collection(db, "compras"), where("cedula", "==", cedula));
  const canSnap = await getDocs(qCan);
  canSnap.forEach(d => {
    const c = d.data();
    const productos = c.items.map(i => i.nombre).join(", ");
    movs.push({
      cedula: cedula,
      fecha: c.fecha.toDate().toISOString().slice(0,10),
      concepto: `Canje: ${productos}`,
      coins: c.total,
      signo: -1
    ]);
  });

  // 3. Ordenar y calcular saldo (sin tocar el original)
  movs.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  let saldo = 0;
  let html = "";
  for (const m of movs) {
    saldo += m.coins * m.signo;
    html += `
      <tr>
        <td>${m.cedula}</td>
        <td>${m.fecha}</td>
        <td>${m.concepto}</td>
        <td>${m.signo === 1 ? "+" : "-"}${m.coins}</td>
        <td>${saldo}</td>
      </tr>`;
  }
  movBody.innerHTML = html;
}

function exportarMovCSV() {
  const filas = Array.from(movBody.querySelectorAll('tr'));
  if (filas.length === 0) return alert("No hay datos para exportar");
  let csv = 'Cedula,Fecha,Concepto,Coins,Saldo\n';
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

// ---------- EVENTOS (SIN TOCAR NADA DE ARRIBA) ----------
btnVerMov.addEventListener("click", () => cargarMovimientos(movCedula.value.trim()));
btnExportMov.addEventListener("click", exportarMovCSV);

uploadProductBtn.addEventListener("click", loadProducts);

// ---------- INICIAL ----------
loadProducts();
loadUsers();
loadCompras();
