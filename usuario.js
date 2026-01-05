import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
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

// ---------- ELEMENTOS ----------
const loginCard   = document.getElementById('login');
const cuentaCard  = document.getElementById('cuenta');
const cedulaInput = document.getElementById('cedulaInput');
const ingresarBtn = document.getElementById('ingresarBtn');
const cerrarBtn   = document.getElementById('cerrarBtn');
const datosUl     = document.getElementById('datos');
const coinsP      = document.getElementById('coins');
const errorMsg    = document.getElementById('errorMsg');
const tiendaDiv   = document.getElementById('productosTienda');
const carritoList = document.getElementById('carritoList');
const bolsaSpan   = document.getElementById('bolsa');

// ---------- VARIABLES ----------
let coinsUsuario = 0;
let carrito = [];

// ---------- EVENTOS ----------
ingresarBtn.addEventListener('click', buscarUsuario);
cerrarBtn.addEventListener('click', () => location.reload());

// ---------- FUNCIONES ----------
async function buscarUsuario() {
  const ced = cedulaInput.value.trim();
  if (!ced) { errorMsg.textContent = 'Escribe tu cédula'; return; }

  const q = query(collection(db, 'usuarios'), where('cedula', '==', ced));
  const snap = await getDocs(q);

  if (snap.empty) {
    errorMsg.textContent = 'Cédula no encontrada';
    return;
  }

  const user = snap.docs[0].data();
  mostrarDatos(user);
}

function mostrarDatos(u) {
  loginCard.classList.add('hidden');
  cuentaCard.classList.remove('hidden');
  coinsUsuario = u.coins_ganados;
  coinsP.textContent = `Mis coins: ${coinsUsuario}`;
  cargarProductos();
}

async function cargarProductos() {
  const snap = await getDocs(collection(db, 'productos'));
  tiendaDiv.innerHTML = '';
  snap.forEach(doc => {
    const p = doc.data();
    const tarj = document.createElement('div');
    tarj.className = 'tarjeta';
    tarj.innerHTML = `
      <img src="assets/productos/${p.producto}.png" onerror="this.src='assets/productos/${p.producto}.jpg'">
      <h4>${p.producto}</h4>
      <div class="precio">${p.coins} coins</div>
      <button onclick="agregarAlCarrito('${p.producto}', ${p.coins})">Agregar</button>`;
    tiendaDiv.appendChild(tarj);
  });
}

function agregarAlCarrito(nombre, precio) {
  if (coinsUsuario < precio) return alert('No tienes coins suficientes');
  carrito.push({nombre, precio});
  actualizarCarrito();
}

function actualizarCarrito() {
  carritoList.innerHTML = '';
  let total = 0;
  carrito.forEach(item => {
    total += item.precio;
    carritoList.innerHTML += `<li>${item.nombre} <span>${item.precio} c</span></li>`;
  });
  bolsaSpan.textContent = `${carrito.length} · ${total} c`;
}
