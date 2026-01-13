import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ================= FIREBASE ================= */
const firebaseConfig = {
  apiKey: "AIzaSyCsz2EP8IsTlG02uU2_GRfyQeeajMDuJjI",
  authDomain: "ajecoins-73829.firebaseapp.com",
  projectId: "ajecoins-73829",
  storageBucket: "ajecoins-73829.firebaseapp.com",
  messagingSenderId: "247461322350",
  appId: "1:247461322350:web:802185ad39249ca650507f"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ================= ELEMENTOS ================= */
const loginCard = document.getElementById('login');
const cuentaCard = document.getElementById('cuenta');
const cedulaInput = document.getElementById('cedulaInput');
const ingresarBtn = document.getElementById('ingresarBtn');
const cerrarBtn = document.getElementById('cerrarBtn');
const datosUl = document.getElementById('datos');
const coinsP = document.getElementById('coins');
const errorMsg = document.getElementById('errorMsg');
const tiendaDiv = document.getElementById('productosTienda');
const carritoList = document.getElementById('carritoList');
const bolsaSpan = document.getElementById('bolsa');
const historialList = document.getElementById('historialList');
const loader = document.getElementById('loader');

/* ================= VARIABLES ================= */
let coinsUsuario = 0;
let carrito = [];
let userCed = '';

/* ================= EVENTOS ================= */
ingresarBtn.addEventListener('click', buscarUsuario);
cerrarBtn.addEventListener('click', () => location.reload());
document.getElementById('btnConfirmar').addEventListener('click', confirmarCompra);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);

document.addEventListener('click', e => {
  if (e.target && e.target.id === 'btnFin') abrirModal();
});

/* ================= LOADER ================= */
function mostrarLoader(mensaje = 'Procesando…') {
  loader.querySelector('p').textContent = mensaje;
  loader.classList.add('active');
}

function ocultarLoader() {
  loader.classList.remove('active');
}

/* ================= LOGIN ================= */
async function buscarUsuario() {
  const ced = cedulaInput.value.trim();
  if (!ced) { 
    errorMsg.textContent = 'Escribe tu cédula'; 
    return; 
  }

  mostrarLoader('Cargando datos del usuario…');

  try {
    const q = query(collection(db, 'usuariosPorFecha'), where('cedula', '==', ced));
    const snap = await getDocs(q);

    if (snap.empty) {
      errorMsg.textContent = 'Cédula no encontrada';
      ocultarLoader();
      return;
    }

    let totalCoins = 0;
    let fechaMasReciente = '';
    let nombre = '';
    let cedis = '';

    snap.forEach(doc => {
      const d = doc.data();
      totalCoins += Number(d.coins_ganados);
      if (!fechaMasReciente || new Date(d.fecha) > new Date(fechaMasReciente)) {
        fechaMasReciente = d.fecha;
        nombre = d.nombre;
        cedis = d.cedis;
      }
    });

    const qCompras = query(collection(db, 'compras'), where('cedula', '==', ced));
    const snapCompras = await getDocs(qCompras);
    let totalGastado = 0;
    snapCompras.forEach(d => totalGastado += Number(d.data().total));

    coinsUsuario = totalCoins - totalGastado;
    userCed = ced;

    mostrarDatos({ fecha: fechaMasReciente, cedula: ced, nombre, cedis });
    coinsP.textContent = coinsUsuario;
    cargarProductos();
    cargarHistorial();
  } catch (err) {
    console.error(err);
    errorMsg.textContent = 'Error al cargar datos';
  } finally {
    ocultarLoader();
  }
}

/* ================= UI ================= */
function mostrarDatos(u) {
  loginCard.classList.add('hidden');
  cuentaCard.classList.remove('hidden');
  datosUl.innerHTML = `
    <li><strong>Fecha:</strong> ${u.fecha}</li>
    <li><strong>Cédula:</strong> ${u.cedula}</li>
    <li><strong>Nombre:</strong> ${u.nombre}</li>
    <li><strong>Cedis:</strong> ${u.cedis}</li>
  `;
}

/* ================= PRODUCTOS ================= */
async function cargarProductos() {
  tiendaDiv.innerHTML = '';
  const snap = await getDocs(collection(db, 'productos'));
  snap.forEach(doc => {
    const p = doc.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `
      <img src="assets/productos/${p.producto}.png">
      <h4>${p.producto}</h4>
      <b>${p.coins} coins</b>
      <button>Agregar</button>
    `;
    div.querySelector('button').onclick = () => agregarAlCarrito(p.producto, p.coins);
    tiendaDiv.appendChild(div);
  });
}

/* ================= CARRITO ================= */
function agregarAlCarrito(nombre, precio) {
  if (coinsUsuario < precio) return alert('No tienes coins suficientes');
  carrito.push({ nombre, precio });
  renderCarrito();
}

function renderCarrito() {
  carritoList.innerHTML = '';
  let total = 0;
  carrito.forEach(i => {
    total += i.precio;
    carritoList.innerHTML += `<li>${i.nombre} <span>${i.precio} c</span></li>`;
  });
  bolsaSpan.textContent = `${total} c`;

  if (carrito.length && !document.getElementById('btnFin')) {
    const b = document.createElement('button');
    b.id = 'btnFin';
    b.textContent = 'Finalizar compra';
    carritoList.after(b);
  }
}

/* ================= MODAL ================= */
function abrirModal() {
  const total = carrito.reduce((a, b) => a + b.precio, 0);
  document.getElementById('totalFin').textContent = `Total: ${total} coins`;
  document.getElementById('resumenList').innerHTML = carrito.map(i => `<li>${i.nombre} · ${i.precio}</li>`).join('');
  document.getElementById('modalFin').classList.remove('hidden');
}

function cerrarModal() {
  document.getElementById('modalFin').classList.add('hidden');
}

/* ================= COMPRA ================= */
async function confirmarCompra() {
  const total = carrito.reduce((a, b) => a + b.precio, 0);
  if (total > coinsUsuario) return alert('Fondos insuficientes');

  mostrarLoader('Procesando compra…');

  try {
    await addDoc(collection(db, 'compras'), {
      cedula: userCed,
      items: carrito,
      total: total,
      fecha: serverTimestamp()
    });

    coinsUsuario -= total;
    coinsP.textContent = coinsUsuario;
    carrito = [];
    renderCarrito();
    cargarHistorial();
  } catch (err) {
    console.error(err);
    alert('Error al procesar compra');
  } finally {
    cerrarModal();
    ocultarLoader();
  }
}

/* ================= HISTORIAL ================= */
async function cargarHistorial() {
  historialList.innerHTML = '';
  const q = query(collection(db, 'compras'), where('cedula', '==', userCed));
  const snap = await getDocs(q);
  if (snap.empty) {
    historialList.innerHTML = '<li>Sin compras</li>';
    return;
  }
  snap.forEach(doc => {
    const c = doc.data();
    historialList.innerHTML += `<li>${c.total} coins</li>`;
  });
}
