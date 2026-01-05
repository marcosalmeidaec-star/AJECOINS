import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp
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
let userId = '';      // ID del doc usuario

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

  const docSnap = snap.docs[0];
  userId = docSnap.id;
  const user = docSnap.data();
  mostrarDatos(user);
}

function mostrarDatos(u) {
  loginCard.classList.add('hidden');
  cuentaCard.classList.remove('hidden');

  datosUl.innerHTML = `
    <li><strong>Fecha:</strong> ${u.fecha}</li>
    <li><strong>Cédula:</strong> ${u.cedula}</li>
    <li><strong>Nombre:</strong> ${u.nombre}</li>
    <li><strong>Cedis:</strong> ${u.cedis}</li>
  `;

  coinsUsuario = u.coins_ganados;
  coinsP.textContent = `Mis coins: ${coinsUsuario}`;
  cargarProductos();
}

async function cargarProductos() {
  tiendaDiv.innerHTML = '<div class="spinner"></div>';
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

  // Botón finalizar
  if (carrito.length && !document.getElementById('btnFin')) {
    const btn = document.createElement('button');
    btn.id = 'btnFin';
    btn.textContent = 'Finalizar compra';
    btn.onclick = abrirModal;
    carritoList.after(btn);
  }
  if (!carrito.length) document.getElementById('btnFin')?.remove();
}

// ---------- MODAL ----------
function abrirModal(){
  const total = carrito.reduce((t,i)=>t+i.precio,0);
  document.getElementById('totalFin').textContent = `Total: ${total} coins`;
  document.getElementById('resumenList').innerHTML = carrito.map(i=>`<li>${i.nombre} · ${i.precio} c</li>`).join('');
  document.getElementById('modalFin').classList.remove('hidden');
}
function cerrarModal(){
  document.getElementById('modalFin').classList.add('hidden');
}
async function confirmarCompra(){
  const total = carrito.reduce((t,i)=>t+i.precio,0);
  if (total > coinsUsuario) return alert('Fondos insuficientes');

  // 1. Descuenta coins
  const nuevoSaldo = coinsUsuario - total;
  await updateDoc(doc(db, 'usuarios', userId), { coins_ganados: nuevoSaldo });

  // 2. Graba historial
  await addDoc(collection(db, 'compras'), {
    cedula: cedulaInput.value.trim(),
    nombre: datosUl.querySelector('li:nth-child(3)').textContent.replace('Nombre: ',''),
    cedis:  datosUl.querySelector('li:nth-child(4)').textContent.replace('Cedis: ',''),
    items:  carrito,
    total:  total,
    fecha:  serverTimestamp()
  });

  // 3. Actualiza UI
  coinsUsuario = nuevoSaldo;
  coinsP.textContent = `Mis coins: ${coinsUsuario}`;
  carrito = [];
  actualizarCarrito();
  cerrarModal();
  mostrarToast();
}

function mostrarToast(){
  const t = document.getElementById('toast');
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),2000);
}
