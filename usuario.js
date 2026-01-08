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
let userCed = '';

// ---------- EVENTOS ----------
ingresarBtn.addEventListener('click', buscarUsuario);
cerrarBtn.addEventListener('click', () => location.reload());
document.getElementById('btnConfirmar').addEventListener('click', confirmarCompra);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);

// Delegación de evento para botón "Finalizar compra" (SIEMPRE funciona)
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'btnFin') {
    abrirModal();
  }
});

// ---------- FUNCIONES ----------
async function buscarUsuario() {
  const ced = cedulaInput.value.trim();
  if (!ced) { errorMsg.textContent = 'Escribe tu cédula'; return; }

  const q = query(collection(db, 'usuariosPorFecha'), where('cedula', '==', ced));
  const snap = await getDocs(q);

  if (snap.empty) {
    errorMsg.textContent = 'Cédula no encontrada';
    return;
  }

  // Sumamos coins y tomamos datos más recientes
  let totalCoins = 0;
  let fechaMasReciente = '';
  let nombre = '';
  let cedis  = '';

  snap.forEach(doc => {
    const data = doc.data();
    totalCoins += data.coins_ganados;
    if (!fechaMasReciente || new Date(data.fecha) > new Date(fechaMasReciente)) {
      fechaMasReciente = data.fecha;
      nombre = data.nombre;
      cedis  = data.cedis;
    }
  });

  // RESTAMOS el total de compras ya hechas
  const qCompras = query(collection(db, 'compras'), where('cedula', '==', ced));
  const snapCompras = await getDocs(qCompras);
  let totalGastado = 0;
  snapCompras.forEach(doc => {
    totalGastado += doc.data().total;
  });

  const saldoReal = totalCoins - totalGastado;

  userCed = ced;
  coinsUsuario = saldoReal;

  mostrarDatos({
    fecha: fechaMasReciente,
    cedula: ced,
    nombre: nombre,
    cedis: cedis,
    coins_ganados: saldoReal
  });

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

  coinsP.textContent = u.coins_ganados;
  coinsUsuario = u.coins_ganados;
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
  carrito.push({ nombre, precio });
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

  // Botón sin evento (la delegación lo hará)
  if (carrito.length && !document.getElementById('btnFin')) {
    const btn = document.createElement('button');
    btn.id = 'btnFin';
    btn.textContent = 'Finalizar compra';
    carritoList.after(btn);
  }
  if (!carrito.length) {
    const old = document.getElementById('btnFin');
    if (old) old.remove();
  }
}

// ---------- MODAL ----------
function abrirModal() {
  const total = carrito.reduce((t, i) => t + i.precio, 0);
  document.getElementById('totalFin').textContent = `Total: ${total} coins`;
  document.getElementById('resumenList').innerHTML = carrito.map(i => `<li>${i.nombre} · ${i.precio} c</li>`).join('');
  document.getElementById('modalFin').classList.remove('hidden');
}
function cerrarModal() {
  document.getElementById('modalFin').classList.add('hidden');
}

// ---------- COMPRA: DESCUENTA DE TODAS LAS FECHAS (SIN ÍNDICE) ----------
async function confirmarCompra() {
  const total = carrito.reduce((t, i) => t + i.precio, 0);
  if (total > coinsUsuario) return alert('Fondos insuficientes');

  // 1. Traer todos los docs de la cédula (sin índice)
  const q = query(
    collection(db, 'usuariosPorFecha'),
    where('cedula', '==', userCed)
  );
  const snap = await getDocs(q);
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  docs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // más reciente primero

  // 2. Descontar proporcionalmente (saltando los que ya están en 0)
  let restante = total;
  for (const doc of docs) {
    if (restante <= 0) break;
    const disponible = doc.coins_ganados;
    if (disponible <= 0) continue; // <-- evitamos negativos y sin índice

    const aDescontar = Math.min(disponible, restante);
    await updateDoc(doc(db, 'usuariosPorFecha', doc.id), {
      coins_ganados: disponible - aDescontar
    });
    restante -= aDescontar;
  }

  // 3. Guardar la compra
  await addDoc(collection(db, 'compras'), {
    cedula: userCed,
    nombre: datosUl.querySelector('li:nth-child(3)').textContent.replace('Nombre: ', ''),
    cedis: datosUl.querySelector('li:nth-child(4)').textContent.replace('Cedis: ', ''),
    items: carrito,
    total: total,
    fecha: serverTimestamp()
  });

  // 4. Actualizar UI
  coinsUsuario -= total;
  coinsP.textContent = coinsUsuario;
  carrito = [];
  actualizarCarrito();
  cerrarModal();
  mostrarToast();
  cargarHistorial();
}

function mostrarToast() {
  const t = document.getElementById('toast');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2000);
}
