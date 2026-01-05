import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 🔹 Config Firebase
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

// 🔹 Elementos DOM
const buscarBtn = document.getElementById("buscarBtn");
const cedulaInput = document.getElementById("cedulaInput");
const mensaje = document.getElementById("mensaje");
const alerta = document.getElementById("alertaCoins");
const nombreElem = document.getElementById("nombre");
const coinsActualesElem = document.getElementById("coinsActuales");
const cedisElem = document.getElementById("cedis");
const infoUsuario = document.getElementById("infoUsuario");
const productosContainer = document.getElementById("productosContainer");
const listaCarrito = document.getElementById("listaCarrito");
const btnSolicitar = document.getElementById("btnSolicitar");
const btnSolicitados = document.getElementById("btnSolicitados");
const tablaHistorial = document.getElementById("tablaHistorial");
const seccionHistorial = document.getElementById("seccionHistorial");

let carrito = [];
let coinsUsuario = 0;
let cedulaGlobal = "";

// 🔹 ALERTAS
function mostrarAlerta(texto) {
  alerta.innerText = texto;
  alerta.style.display = "block";
  setTimeout(() => alerta.style.display = "none", 3000);
}

// 🔹 ACTUALIZAR CARRITO
function actualizarCarrito() {
  listaCarrito.innerHTML = "";
  let total = 0;

  carrito.forEach(item => {
    total += item.coins * item.cantidad;
    const li = document.createElement("li");
    li.innerHTML = `${item.nombre} x${item.cantidad} <strong>${item.coins * item.cantidad}</strong>`;
    listaCarrito.appendChild(li);
  });

  coinsActualesElem.innerText = coinsUsuario - total;
}

// ==========================
// 🔹 BUSCAR USUARIO
// ==========================
buscarBtn.onclick = async () => {
  const cedula = cedulaInput.value.trim();
  if (!cedula) return;

  cedulaGlobal = cedula;
  mensaje.innerText = "Cargando...";
  productosContainer.innerHTML = "";
  listaCarrito.innerHTML = "";
  carrito = [];

  const userSnap = await getDoc(doc(db, "usuarios", cedula));
  if (!userSnap.exists()) {
    mensaje.innerText = "Usuario no encontrado";
    infoUsuario.style.display = "none";
    return;
  }

  const data = userSnap.data();
  nombreElem.innerText = data.nombre;
  coinsUsuario = data.coins_actuales || 0;
  coinsActualesElem.innerText = coinsUsuario;
  cedisElem.innerText = data.cedis || "-";
  infoUsuario.style.display = "block";
  mensaje.innerText = "";

  // 🔹 Cargar productos
  const productosSnap = await getDocs(collection(db, "productos"));
  productosSnap.forEach(p => {
    const prod = p.data();
    const card = document.createElement("div");
    card.className = "producto-card";
    card.innerHTML = `
      <img src="${prod.imagen}">
      <h4>${prod.nombre}</h4>
      <p>${prod.coins} coins</p>
      <button>Agregar</button>
    `;
    card.querySelector("button").onclick = () => {
      if (prod.coins > coinsActualesElem.innerText) {
        mostrarAlerta("❌ Coins insuficientes");
        return;
      }
      const ex = carrito.find(i => i.nombre === prod.nombre);
      ex ? ex.cantidad++ : carrito.push({ ...prod, cantidad: 1 });
      actualizarCarrito();
    };
    productosContainer.appendChild(card);
  });
};

// ==========================
// 🔹 SOLICITAR PRODUCTOS (CANJEAR)
btnSolicitar.onclick = async () => {
  if (!carrito.length) return mostrarAlerta("Carrito vacío");

  const total = carrito.reduce((s,i)=>s+i.coins*i.cantidad,0);
  if(total > coinsUsuario) return mostrarAlerta("❌ Coins insuficientes");

  const fecha = new Date().toLocaleDateString("es-ES");

  for (const item of carrito) {
    // 🔹 Guardar en movimientos usuario
    const idMov = `${fecha}_${Date.now()}_${item.nombre}`;
    await setDoc(doc(db, "usuarios", cedulaGlobal, "movimientos", idMov), {
      fecha,
      producto: item.nombre,
      coins_canjeados: item.coins * item.cantidad,
      coins_ganados: 0,
      coins_actuales: coinsUsuario - total,
      tipo: "canje"
    });

    // 🔹 Guardar en canjes globales
    const idCanje = `${cedulaGlobal}_${fecha}_${item.nombre}_${Date.now()}`;
    await setDoc(doc(db, "canjes_globales", idCanje), {
      fecha,
      cedula: cedulaGlobal,
      nombre: nombreElem.innerText,
      producto: item.nombre,
      coins_canjeados: item.coins * item.cantidad,
      saldo_final: coinsUsuario - total
    });
  }

  // 🔹 Actualizar coins_actuales
  coinsUsuario -= total;
  await setDoc(doc(db,"usuarios",cedulaGlobal),{coins_actuales: coinsUsuario},{merge:true});

  carrito = [];
  actualizarCarrito();
  mostrarAlerta("✅ Productos solicitados correctamente");
};

// ==========================
// 🔹 VER PRODUCTOS SOLICITADOS (HISTORIAL)
btnSolicitados.onclick = async () => {
  seccionHistorial.style.display = "block";
  tablaHistorial.innerHTML = "";

  const movSnap = await getDocs(collection(db,"usuarios",cedulaGlobal,"movimientos"));
  movSnap.forEach(m => {
    const d = m.data();
    if(d.tipo !== "canje") return; // solo canjes
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.fecha}</td>
      <td>${d.producto}</td>
      <td>${d.coins_canjeados}</td>
      <td>${d.coins_actuales}</td>
    `;
    tablaHistorial.appendChild(tr);
  });
};
