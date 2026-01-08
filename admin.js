import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc, deleteDoc, query, where
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
const db  = getFirestore(app);

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

// Cargar usuarios: si se pasa una fecha, filtra por ella
async function loadUsers(fecha = null) {
  console.log("loadUsers() ejecutándose con fecha:", fecha);
  let q = collection(db, "usuariosPorFecha");
  if (fecha) q = query(q, where("fecha", "==", fecha));

  const snap = await getDocs(q);
  const usuarios = [];
  snap.forEach(d => usuarios.push(d.data()));
  console.log("Registros obtenidos:", usuarios.length);
  pintarTablaUsuarios(usuarios);
}

// Eventos de filtro
btnFiltrar.addEventListener("click", () => {
  const fecha = filtroFecha.value;
  if (!fecha) return alert("Selecciona una fecha");
  loadUsers(fecha);
});

btnVerTodo.addEventListener("click", () => {
  filtroFecha.value = "";
  loadUsers();
});

// Subida de archivo
uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona el CSV de usuarios");

  const text = await file.text();
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

  // Borrar solo las fechas que vienen en el archivo
  for (const fecha of fechasEnArchivo) {
    const q = query(collection(db, "usuariosPorFecha"), where("fecha", "==", fecha));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, "usuariosPorFecha", docSnap.id));
    }
  }

  // Subir y mostrar al instante
  const subidos = [];
  for (const line of lines) {
    const parts = line.trim().split(";");
    if (parts.length < 5 || parts[0].trim() === "" || parts[1].trim() === "") continue;
    const [fecha, cedula, nombre, cedis, coins_ganados] = parts.map(x => x.trim());
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

// ----------- EXPORTAR USUARIOS -----------
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

// ----------- PRODUCTOS -----------
const productFileInput = document.getElementById("productFileInput");
const uploadProductBtn = document.getElementById("uploadProductBtn");
const productsBody     = document.querySelector("#productsTable tbody");

uploadProductBtn.addEventListener("click", async () => {
  const file = productFileInput.files[0];
  if (!file) return alert("Selecciona el CSV de productos");
  const text  = await file.text();
  const lines = text.trim().split("\n");
  let first   = true;
  for (const line of lines) {
    if (first) { first = false; continue; }
    const clean = line.trim().replace(/"/g, "");
    if (!clean) continue;
    const [nombre, coins] = clean.split(/\s*;\s*/);
    const prod = nombre.trim();
    await setDoc(doc(db, "productos", prod), {
      producto: prod,
      coins: parseInt(coins.trim(), 10)
    });
  }
  alert("Productos cargados");
  loadProducts();
});

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

// ----------- HISTORIAL + EXPORTAR -----------
const comprasBody = document.querySelector('#comprasTable tbody');
const btnExport   = document.getElementById('btnExport');

btnExport.addEventListener('click', exportarComprasCSV);

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

// ---------- INICIAL ----------
loadProducts();
loadUsers();
loadCompras();

const btnExportUsers = document.getElementById('btnExportUsers');
if (btnExportUsers) btnExportUsers.addEventListener('click', exportarUsuariosCSV);
