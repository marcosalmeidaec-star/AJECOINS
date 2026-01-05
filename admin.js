import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs
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

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const usersBody = document.querySelector("#usersTable tbody");
const productsBody = document.querySelector("#productsTable tbody");

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona un archivo CSV");
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
  alert("Archivo cargado");
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

async function loadProducts() {
  productsBody.innerHTML = "";
  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => {
    const p = d.data();
    productsBody.innerHTML += `
      <tr>
        <td>${p.producto}</td>
        <td><img src="assets/productos/${p.imagen}" alt="${p.producto}"/></td>
        <td>${p.coins}</td>
      </tr>`;
  });
}

loadUsers();
loadProducts();
