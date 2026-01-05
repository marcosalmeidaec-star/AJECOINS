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
const historialList = document.getElementById('historialList');

// ---------- VARIABLES ----------
let coinsUsuario = 0;
let carrito = [];
let userId = '';
let userCed = '';

// ---------- EVENTOS ----------
ingresarBtn.addEventListener('click', buscarUsuario);
cerrarBtn.addEventListener('click', () => location.reload());
document.getElementById('btnConfirmar').addEventListener('click', confirmarCompra);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);

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
  userCed = ced;
  const user = docSnap.data();
  mostrarDatos(user);
  cargarHistorial();
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
  coinsP.textContent = coinsUsuario;
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

    const img = document.createElement('img');
    img.src = `assets/productos/${p.producto}.png`;
    img.onerror = () => img.src = `assets/productos/${p.producto}.jpg`;

    const h4 = document.createElement('h4');
    h4.textContent = p.producto;

    const precioDiv = document.createElement('div');
    precioDiv.className = 'precio';
    precioDiv.textContent = `${p.coins} coins`;

    const btn = document.createElement('button');
    btn.textContent = 'Agregar';
    btn.onclick = () => agregarAlCarrito(p.producto, p.coins);

    tarj.append(img, h4, precioDiv, btn);
    tiendaDiv.appendChild(tarj);
  });
}

async function cargarHistorial() {
  historialList.innerHTML = '';
  const q = query(collection(db, 'compras'), where('cedula', '==', userCed));
  const snap = await getDocs(q);
  if (snap.empty) {
    historialList.innerHTML = '<li style="text-align:center;color:#777;">Sin compras</li>';
    return;
  }
  snap.forEach(doc => {
    const c = doc.data();
    const fecha = c.fecha?.toDate().toLocaleString('es-EC') || '-';
    const productos = c.items.map(i => i.nombre).join(', ');
    const li = document.createElement('li');
    li.innerHTML = `<span>${fecha}</span><span>${productos}</span><span>${c.total} c</span>`;
    historialList.appendChild(li);
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

  const nuevoSaldo = coinsUsuario - total;
  await updateDoc(doc(db, 'usuarios', userId), { coins_ganados: nuevoSaldo });

  await addDoc(collection(db, 'compras'), {
    cedula: userCed,
    nombre: datosUl.querySelector('li:nth-child(3)').textContent.replace('Nombre: ',''),
    cedis:  datosUl.querySelector('li:nth-child(4)').textContent.replace('Cedis: ',''),
    items:  carrito,
    total:  total,
    fecha:  serverTimestamp()
  });

  coinsUsuario = nuevoSaldo;
  coinsP.textContent = coinsUsuario;
  carrito = [];
  actualizarCarrito();
  cerrarModal();
  mostrarToast();
  cargarHistorial();
}

function mostrarToast(){
  const t = document.getElementById('toast');
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),2000);
}
