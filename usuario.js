import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs,
  updateDoc, doc, addDoc, serverTimestamp
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

/* ================= ELEMENTOS ================= */

const loginCard   = document.getElementById("login");
const cuentaCard  = document.getElementById("cuenta");
const cedulaInput = document.getElementById("cedulaInput");
const ingresarBtn = document.getElementById("ingresarBtn");
const cerrarBtn   = document.getElementById("cerrarBtn");
const datosUl     = document.getElementById("datos");
const coinsP      = document.getElementById("coins");
const errorMsg    = document.getElementById("errorMsg");
const tiendaDiv   = document.getElementById("productosTienda");
const carritoList = document.getElementById("carritoList");
const bolsaSpan   = document.getElementById("bolsa");
const historialList = document.getElementById("historialList");

const modal = document.getElementById("modalFin");
const resumenList = document.getElementById("resumenList");
const totalFin = document.getElementById("totalFin");
const btnConfirmar = document.getElementById("btnConfirmar");
const btnCancelar = document.getElementById("btnCancelar");

const loader = document.getElementById("loader");

/* ================= LOADER ================= */

function mostrarLoader(texto = "Procesando…"){
  loader.querySelector("p").textContent = texto;
  loader.classList.remove("hidden");
}
function ocultarLoader(){
  loader.classList.add("hidden");
}

/* ================= VARIABLES ================= */

let coinsUsuario = 0;
let carrito = [];
let userCed = "";
let procesando = false;

/* ================= EVENTOS ================= */

ingresarBtn.addEventListener("click", buscarUsuario);
cerrarBtn.addEventListener("click", () => location.reload());
btnConfirmar.addEventListener("click", confirmarCompra);
btnCancelar.addEventListener("click", () => modal.classList.add("hidden"));

document.addEventListener("click", e => {
  if (e.target && e.target.id === "btnFin") abrirModal();
});

/* ================= LOGIN ================= */

async function buscarUsuario(){
  errorMsg.textContent = "";
  const ced = cedulaInput.value.trim();
  if(!ced){ errorMsg.textContent="Ingrese su cédula"; return; }

  mostrarLoader("Buscando usuario…");

  try{
    const q = query(collection(db,"usuariosPorFecha"), where("cedula","==",ced));
    const snap = await getDocs(q);

    if(snap.empty){
      errorMsg.textContent="Cédula no encontrada";
      return;
    }

    let total=0, fecha="", nombre="", cedis="";

    snap.forEach(d=>{
      const data=d.data();
      total+=Number(data.coins_ganados);
      if(!fecha || new Date(data.fecha)>new Date(fecha)){
        fecha=data.fecha;
        nombre=data.nombre;
        cedis=data.cedis;
      }
    });

    const q2=query(collection(db,"compras"),where("cedula","==",ced));
    const s2=await getDocs(q2);
    let gastado=0;
    s2.forEach(d=>gastado+=Number(d.data().total));

    coinsUsuario=total-gastado;
    userCed=ced;

    mostrarDatos({fecha,nombre,cedis,cedula:ced,coins:coinsUsuario});
    cargarProductos();
    cargarHistorial();

  }catch(e){
    alert("Error al buscar usuario");
    console.error(e);
  }finally{
    ocultarLoader();
  }
}

/* ================= UI ================= */

function mostrarDatos(u){
  loginCard.classList.add("hidden");
  cuentaCard.classList.remove("hidden");
  datosUl.innerHTML=`
    <li><b>Nombre:</b> ${u.nombre}</li>
    <li><b>Cédula:</b> ${u.cedula}</li>
    <li><b>Cedis:</b> ${u.cedis}</li>
    <li><b>Fecha:</b> ${u.fecha}</li>
  `;
  coinsP.textContent=u.coins;
}

/* ================= PRODUCTOS ================= */

async function cargarProductos(){
  tiendaDiv.innerHTML='<div class="spinner"></div>';
  const snap=await getDocs(collection(db,"productos"));
  tiendaDiv.innerHTML="";
  snap.forEach(d=>{
    const p=d.data();
    const div=document.createElement("div");
    div.className="tarjeta";
    div.innerHTML=`
      <img src="assets/productos/${p.producto}.png">
      <h4>${p.producto}</h4>
      <b>${p.coins} coins</b>
      <button>Agregar</button>
    `;
    div.querySelector("button").onclick=()=>agregar(p.producto,p.coins);
    tiendaDiv.appendChild(div);
  });
}

/* ================= CARRITO ================= */

function agregar(nombre,precio){
  if(coinsUsuario<precio) return alert("No tienes coins");
  carrito.push({nombre,precio});
  renderCarrito();
}

function renderCarrito(){
  carritoList.innerHTML="";
  let total=0;
  carrito.forEach(i=>{
    total+=i.precio;
    carritoList.innerHTML+=`<li>${i.nombre} <span>${i.precio} c</span></li>`;
  });
  bolsaSpan.textContent=total;

  if(carrito.length && !document.getElementById("btnFin")){
    const b=document.createElement("button");
    b.id="btnFin";
    b.textContent="Finalizar compra";
    carritoList.after(b);
  }
}

/* ================= MODAL ================= */

function abrirModal(){
  resumenList.innerHTML=carrito.map(i=>`<li>${i.nombre} - ${i.precio}</li>`).join("");
  const total=carrito.reduce((a,b)=>a+b.precio,0);
  totalFin.textContent=`Total: ${total} coins`;
  modal.classList.remove("hidden");
}

/* ================= HISTORIAL ================= */

async function cargarHistorial(){
  historialList.innerHTML="";
  const q=query(collection(db,"compras"),where("cedula","==",userCed));
  const snap=await getDocs(q);
  if(snap.empty){ historialList.innerHTML="<li>Sin compras</li>"; return;}
  snap.forEach(d=>{
    const c=d.data();
    const li=document.createElement("li");
    li.textContent=`${c.total} coins`;
    historialList.appendChild(li);
  });
}

/* ================= COMPRA ================= */

async function confirmarCompra(){
  if(procesando) return;
  procesando=true;
  mostrarLoader("Procesando compra…");

  try{
    const total=carrito.reduce((a,b)=>a+b.precio,0);

    await addDoc(collection(db,"compras"),{
      cedula:userCed,
      items:carrito,
      total,
      fecha:serverTimestamp()
    });

    coinsUsuario-=total;
    coinsP.textContent=coinsUsuario;
    carrito=[];
    renderCarrito();
    modal.classList.add("hidden");
    cargarHistorial();

  }catch(e){
    alert("Error al comprar");
    console.error(e);
  }finally{
    ocultarLoader();
    procesando=false;
  }
}
