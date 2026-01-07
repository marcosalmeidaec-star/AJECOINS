import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, setDoc, doc, query, where
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

// ----------- USUARIOS (CADA REGISTRO INDIVIDUAL, histórico por fecha) -----------
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const usersBody = document.querySelector("#usersTable tbody");

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona el CSV de usuarios");

  const text = await file.text();
  const lines = text.trim().split("\n").slice(1); // salta encabezado

  let totalProcesados = 0;

  // PROCESA CADA LÍNEA INDIVIDUALMENTE
  for (const line of lines) {
    const parts = line.trim().split(";");
    if (parts.length < 5 || parts[0].trim() === "" || parts[1].trim() === "") continue;

    const [fecha, cedula, nombre, cedis, coins_ganados] = parts;

    // ID único: FECHA + CÉDULA (permite misma cédula en distinta fecha)
    const docId = `${fecha.trim()}_${cedula.trim()}`;

    await setDoc(doc(db, "usuarios", docId), {
      fecha: fecha.trim(),
      cedula: cedula.trim(),
      nombre: nombre.trim(),
      cedis: cedis.trim(),
      coins_ganados: parseInt(coins_ganados.trim(), 10)
    });
    totalProcesados++;
  }

  alert(`Total de registros procesados: ${totalProcesados}`);
  loadUsers();
});

async function loadUsers() {
  usersBody.innerHTML = "";
  console.log("Reflejando usuarios...");

  const snap = await getDocs(collection(db, "usuarios"));
  const registros = [];
  snap.forEach(d => registros.push(d.data()));

  // orden cronológico
  registros.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let totalFilas = 0;
  registros.forEach(u => {
    usersBody.innerHTML += `
      <tr>
        <td>${u.fecha}</td>
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td>${u.cedis}</td>
        <td>${u.coins_ganados}</td>
      </tr>`;
    totalFilas++;
  });

  console.log("Total filas reflejadas:", totalFilas);
}

// ----------- PRODUCTOS -----------
const productFileInput = document.getElementById("productFileInput");
const uploadProductBtn = document.getElementById("uploadProductBtn");
const productsBody = document.querySelector("#productsTable tbody");

uploadProductBtn.addEventListener("click", async () => {
  const file = productFileInput.files[0];
  if (!file) return alert("Selecciona el CSV de productos");
  const text = await file.text();
  const lines = text.trim().split("\n");
  let first = true;
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
