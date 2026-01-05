import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc
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

// ----------- CARGAR PRODUCTOS -----------
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
    if (first) { first = false; continue; } // salta encabezado
    const clean = line.trim().replace(/"/g, "");
    if (!clean) continue;
    const [nombre, coins] = clean.split(/\s*;\s*/); // ← separador ;
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
        <td><img src="assets/productos/${p.producto}.png" alt="${p.producto}" onerror="this.src='assets/productos/${p.producto}.jpg'"/></td>
        <td>${p.coins}</td>
      </tr>`;
  });
}

// ----------- CARGAR USUARIOS -----------
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const usersBody = document.querySelector("#usersTable tbody");

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona el CSV de usuarios");
  const text = await file.text();
  const lines = text.trim().split("\n").slice(1);
  for (const line of lines) {
    const [fecha, cedula, nombre, cedis, coins_ganados] = line.split(",");
    await addDoc(collection(db, "usuarios"), {
      fecha: fecha.trim(),
      cedula: cedula.trim(),
      nombre: nombre.trim(),
      cedis: cedis.trim(),
      coins_ganados: parseInt(coins_ganados.trim(), 10)
    });
  }
  alert("Usuarios cargados");
  loadUsers();
});

async function loadUsers() {
  usersBody.innerHTML = "";
  const snap = await getDocs(collection(db, "usuarios"));
  snap.forEach(d => {
    const u = d.data();
    usersBody.innerHTML += `
      <tr>
        <td>${u.fecha}</td>
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td>${u.cedis}</td>
        <td>${u.coins_ganados}</td>
      </tr>`;
  });
}

// ----------- INICIAL --------
loadProducts();
loadUsers();
