import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ================= FIREBASE ================= */

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

/* ================= VARIABLES ================= */

let userCed = "";
let coinsUsuario = 0;
let carrito = [];

/* ================= LOGIN ================= */

document.getElementById("ingresarBtn").addEventListener("click", async () => {
  const ced = document.getElementById("cedulaInput").value.trim();
  if (!ced) return alert("Escribe tu cédula");

  userCed = ced;

  // Traer TODOS los movimientos históricos
  const movSnap = await getDocs(
    query(collection(db, "usuariosPorFecha"), where("cedula", "==", ced))
  );

  if (movSnap.empty) {
    alert("Cédula no existe");
    return;
  }

  let totalIngreso = 0;
  let nombre = "";
  let cedis = "";
  let fecha = "";

  movSnap.forEach(d => {
    const x = d.data();
    totalIngreso += x.coins_ganados;

    // tomamos los datos más recientes
    if (!fecha || x.fecha > fecha) {
      fecha = x.fecha;
      nombre = x.nombre;
      cedis = x.cedis;
    }
  });

  // Traer compras
  const comprasSnap = await getDocs(
    query(collection(db, "compras"), where("cedula", "==", ced))
  );

  let totalGasto = 0;
  comprasSnap.forEach(d => totalGasto += d.data().total);

  coinsUsuario = totalIngreso - totalGasto;

  // Pintar datos
  document.getElementById("coins").textContent = coinsUsuario;
  document.getElementById("datos").innerHTML = `
    <li><strong>Nombre:</strong> ${nombre}</li>
    <li><strong>Cédula:</strong> ${ced}</li>
    <li><strong>Cedis:</strong> ${cedis}</li>
    <li><strong>Última fecha:</strong> ${fecha}</li>
  `;

  cargarProductos();
  cargarHistorial();
});

/* ================= PRODUCTOS ================= */

async function cargarProductos() {
  const div = document.getElementById("productosTienda");
  div.innerHTML = "";

  const snap = await getDocs(collection(db, "productos"));

  snap.forEach(d => {
    const p = d.data();
    const card = document.createElement("div");

    const img = document.createElement("img");
    img.src = `assets/productos/${p.producto}.png`;
    img.onerror = () => img.src = "assets/productos/noimage.png";

    card.appendChild(img);
    card.innerHTML += `
      <h4>${p.producto}</h4>
      <b>${p.coins} coins</b>
      <button>Agregar</button>
    `;

    card.querySelector("button").onclick = () => agregar(p.producto, p.coins);
    div.appendChild(card);
  });
}

/* ================= CARRITO ================= */

function agregar(nombre, precio) {
  if (coinsUsuario < precio) return alert("Saldo insuficiente");
  carrito.push({ nombre, precio });
  renderCarrito();
}

function renderCarrito() {
  const ul = document.getElementById("carritoList");
  ul.innerHTML = "";

  let total = 0;
  carrito.forEach(i => {
    total += i.precio;
    ul.innerHTML += `<li>${i.nombre} · ${i.precio} coins</li>`;
  });

  document.getElementById("bolsa").textContent = total;
}

/* ================= CONFIRMAR COMPRA ================= */

document.getElementById("btnConfirmar").addEventListener("click", async () => {
  const total = carrito.reduce((a, b) => a + b.precio, 0);
  if (total > coinsUsuario) return alert("Fondos insuficientes");

  await addDoc(collection(db, "compras"), {
    cedula: userCed,
    items: carrito,
    total: total,
    fecha: serverTimestamp()
  });

  carrito = [];
  renderCarrito();
  cargarHistorial();

  // Recalcular saldo real SIN tocar historial
  const movSnap = await getDocs(
    query(collection(db, "usuariosPorFecha"), where("cedula", "==", userCed))
  );

  let ingreso = 0;
  movSnap.forEach(d => ingreso += d.data().coins_ganados);

  const comprasSnap = await getDocs(
    query(collection(db, "compras"), where("cedula", "==", userCed))
  );

  let gasto = 0;
  comprasSnap.forEach(d => gasto += d.data().total);

  coinsUsuario = ingreso - gasto;
  document.getElementById("coins").textContent = coinsUsuario;
});

/* ================= HISTORIAL ================= */

async function cargarHistorial() {
  const ul = document.getElementById("historialList");
  ul.innerHTML = "";

  const snap = await getDocs(
    query(collection(db, "compras"), where("cedula", "==", userCed))
  );

  snap.forEach(d => {
    const c = d.data();
    ul.innerHTML += `<li>${c.total} coins</li>`;
  });
}
