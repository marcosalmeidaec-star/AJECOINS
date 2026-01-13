import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js  ";
import {
  getFirestore, collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js  ";

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

// ---------- VARIABLES ----------
let coinsUsuario = 0;
let carrito = [];
let userCed = '';

// ---------- ELEMENTAS ----------
const loginCard   = document.getElementById('login');
const cuentaCard  = document.getElementById('cuenta');
const cedulaInput = document.getElementById('cedulaInput');
const ingresarBtn = document.getElementById('ingresarBtn');
const cerrarBtn   = document.getElementById('cerrarBtn');
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
