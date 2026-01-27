import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc,
  query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* =================== FIREBASE CONFIG =================== */
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

/* =================== CARGA USUARIOS (NUEVA ESTRUCTURA) =================== */
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

uploadBtn.onclick = async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona CSV");

  const text = await file.text();
  // Estructura CSV: fecha; codigo vendedor; nombre; cedis; coins
  const lines = text.trim().split("\n").slice(1);
  let subidos = 0;

  for (const line of lines) {
    const [fechaRaw, codVendedor, nombre, cedis, coins] = line.split(";").map(x => x.trim());
    if (!fechaRaw || !codVendedor) continue;

    const fecha = normalizarFecha(fechaRaw);
    const id = `${fecha}_${codVendedor}`;

    await setDoc(doc(db, "usuariosPorFecha", id), {
      fecha,
      codVendedor: codVendedor, // Se usa el código de vendedor como identificador
      nombre,
      cedis,
      coins_ganados: Number(coins),
      creado: Timestamp.now()
    }, { merge: true });

    subidos++;
  }

  alert(`Registros cargados: ${subidos}`);
  loadUsers();
};

/* =================== USUARIOS =================== */
const usersBody = document.querySelector("#usersTable tbody");
const filtroFecha = document.getElementById("filtroFecha");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnVerTodo = document.getElementById("btnVerTodo");
const btnExportUsers = document.getElementById("btnExportUsers");

let cacheUsuarios = [];

async function loadUsers() {
  usersBody.innerHTML = "";
  cacheUsuarios = [];
  const snap = await getDocs(collection(db, "usuariosPorFecha"));
  snap.forEach(d => cacheUsuarios.push(d.data()));
  renderUsers(cacheUsuarios);
}

function renderUsers(lista) {
  usersBody.innerHTML = "";
  lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  lista.forEach(u => {
    usersBody.innerHTML += `
      <tr>
        <td>${u.fecha}</td>
        <td>${u.codVendedor}</td>
        <td>${u.nombre}</td>
        <td>${u.cedis}</td>
        <td>${u.coins_ganados}</td>
      </tr>`;
  });
}

btnFiltrar.onclick = () => renderUsers(cacheUsuarios.filter(u => u.fecha === filtroFecha.value));
btnVerTodo.onclick = () => renderUsers(cacheUsuarios);

btnExportUsers.onclick = () => {
  const filas = [["Fecha", "Codigo Vendedor", "Nombre", "Cedis", "Coins"]];
  cacheUsuarios.forEach(u => filas.push([u.fecha, u.codVendedor, u.nombre, u.cedis, u.coins_ganados]));
  descargarCSV("usuarios.csv", filas);
};

/* =================== PRODUCTOS =================== */
const productFileInput = document.getElementById("productFileInput");
const uploadProductBtn = document.getElementById("uploadProductBtn");
const productsBody = document.querySelector("#productsTable tbody");

uploadProductBtn.onclick = async () => {
  const file = productFileInput.files[0];
  if (!file) return alert("Selecciona CSV productos");

  const text = await file.text();
  const lines = text.trim().split("\n").slice(1);

  for (const line of lines) {
    const [nombre, coins] = line.replace(/"/g, "").split(";");
    await setDoc(doc(db, "productos", nombre.trim()), {
      producto: nombre.trim(),
      coins: Number(coins)
    });
  }
  loadProducts();
};

async function loadProducts() {
  productsBody.innerHTML = "";
  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => {
    const p = d.data();
    productsBody.innerHTML += `
      <tr>
        <td>${p.producto}</td>
        <td><img src="assets/productos/${p.producto}.png" width="60"></td>
        <td>${p.coins}</td>
      </tr>`;
  });
}

/* =================== COMPRAS =================== */
const comprasBody = document.querySelector("#comprasTable tbody");
const btnExport = document.getElementById("btnExport");
let cacheCompras = [];

async function loadCompras() {
  comprasBody.innerHTML = "";
  cacheCompras = [];
  const snap = await getDocs(collection(db, "compras"));
  snap.forEach(d => cacheCompras.push(d.data()));
  renderCompras(cacheCompras);
}

function renderCompras(lista) {
  comprasBody.innerHTML = "";
  lista.sort((a, b) => a.fecha.toMillis() - b.fecha.toMillis());
  lista.forEach(c => {
    comprasBody.innerHTML += `
      <tr>
        <td>${c.fecha.toDate().toLocaleString()}</td>
        <td>${c.codVendedor || c.cedula}</td> 
        <td>${c.nombre}</td>
        <td>${c.cedis}</td>
        <td>${c.items.map(i => i.nombre).join(", ")}</td>
        <td>${c.total}</td>
      </tr>`;
  });
}

btnExport.onclick = () => {
  const filas = [["Fecha", "Cod Vendedor", "Nombre", "Cedis", "Productos", "Total"]];
  cacheCompras.forEach(c => filas.push([
    c.fecha.toDate().toLocaleString(),
    c.codVendedor || c.cedula,
    c.nombre,
    c.cedis,
    c.items.map(i => i.nombre).join(", "),
    c.total
  ]));
  descargarCSV("compras.csv", filas);
};

/* =================== MOVIMIENTOS =================== */
const movCedula = document.getElementById("movCedula");
const btnVerMov = document.getElementById("btnVerMov");
const btnVerTodosMov = document.getElementById("btnVerTodosMov");
const btnExportMov = document.getElementById("btnExportMov");
const movBody = document.querySelector("#movTable tbody");

let cacheMovimientos = [];

btnVerMov.onclick = async () => {
  const cod = movCedula.value.trim();
  if (!cod) return alert("Ingresa un código de vendedor");
  const movimientos = await obtenerMovimientosPorCodigo(cod);
  cacheMovimientos = movimientos;
  renderMov(movimientos);
};

btnVerTodosMov.onclick = async () => {
  const movimientos = await obtenerTodosMovimientos();
  cacheMovimientos = movimientos;
  renderMov(movimientos);
};

async function obtenerMovimientosPorCodigo(cod) {
  let mov = [];
  let saldo = 0;

  // Busca por codVendedor
  const ingresos = await getDocs(query(collection(db, "usuariosPorFecha"), where("codVendedor", "==", cod)));
  ingresos.forEach(d => {
    const u = d.data();
    mov.push({ codVendedor: u.codVendedor, nombre: u.nombre, cedis: u.cedis, fecha: u.fecha, concepto: "Carga", coins: u.coins_ganados });
  });

  const compras = await getDocs(query(collection(db, "compras"), where("codVendedor", "==", cod)));
  compras.forEach(d => {
    const c = d.data();
    mov.push({ codVendedor: c.codVendedor, nombre: c.nombre, cedis: c.cedis, fecha: c.fecha.toDate().toISOString().slice(0, 10), concepto: c.items.map(i => i.nombre).join(", "), coins: -c.total });
  });

  mov.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  mov.forEach(m => { saldo += m.coins; m.saldo = saldo });
  return mov;
}

async function obtenerTodosMovimientos() {
  let mov = [];
  let saldoPorUsuario = {};

  const ingresos = await getDocs(collection(db, "usuariosPorFecha"));
  ingresos.forEach(d => {
    const u = d.data();
    const id = u.codVendedor;
    if (!saldoPorUsuario[id]) saldoPorUsuario[id] = 0;
    saldoPorUsuario[id] += u.coins_ganados;
    mov.push({ codVendedor: id, nombre: u.nombre, cedis: u.cedis, fecha: u.fecha, concepto: "Carga", coins: u.coins_ganados, saldo: saldoPorUsuario[id] });
  });

  const compras = await getDocs(collection(db, "compras"));
  compras.forEach(d => {
    const c = d.data();
    const id = c.codVendedor;
    if (!saldoPorUsuario[id]) saldoPorUsuario[id] = 0;
    saldoPorUsuario[id] -= c.total;
    mov.push({ codVendedor: id, nombre: c.nombre, cedis: c.cedis, fecha: c.fecha.toDate().toISOString().slice(0, 10), concepto: c.items.map(i => i.nombre).join(", "), coins: -c.total, saldo: saldoPorUsuario[id] });
  });

  mov.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  return mov;
}

function renderMov(lista) {
  movBody.innerHTML = "";
  if (!lista.length) {
    movBody.innerHTML = "<tr><td colspan='7'>Sin movimientos</td></tr>";
    return;
  }
  lista.forEach(m => {
    movBody.innerHTML += `
      <tr>
        <td>${m.codVendedor}</td>
        <td>${m.nombre}</td>
        <td>${m.cedis}</td>
        <td>${m.fecha}</td>
        <td>${m.concepto}</td>
        <td style="color:${m.coins >= 0 ? 'green' : 'red'}">${m.coins}</td>
        <td>${m.saldo}</td>
      </tr>`;
  });
}

/* ---- EXPORTAR MOVIMIENTOS ---- */
btnExportMov.onclick = () => {
  if (!cacheMovimientos.length) return alert("No hay datos");
  const filas = [["Cod Vendedor", "Nombre", "Cedis", "Fecha", "Concepto", "Coins", "Saldo"]];
  cacheMovimientos.forEach(m => filas.push([m.codVendedor, m.nombre, m.cedis, m.fecha, m.concepto, m.coins, m.saldo]));
  descargarCSV("movimientos.csv", filas);
};

/* =================== INIT =================== */
loadUsers();
loadProducts();
loadCompras();
