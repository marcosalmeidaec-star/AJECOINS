import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore, doc, getDoc, collection, getDocs, addDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 🔹 Firebase config
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

// 🔹 DOM elements
const buscarBtn = document.getElementById("buscarBtn");
const cedulaInput = document.getElementById("cedulaInput");
const mensaje = document.getElementById("mensaje");

const infoUsuario = document.getElementById("infoUsuario");
const nombre = document.getElementById("nombre");
const coinsActuales = document.getElementById("coinsActuales");
const cedis = document.getElementById("cedis");

const productosContainer = document.getElementById("productosContainer");
const listaCarrito = document.getElementById("listaCarrito");
const btnSolicitar = document.getElementById("btnSolicitar");
const btnHistorial = document.getElementById("btnHistorial");
const seccionHistorial = document.getElementById("seccionHistorial");
const tablaHistorial = document.getElementById("tablaHistorial");

let carrito = [];
let coinsUsuario = 0;
let cedulaGlobal = "";

// --------------------------
// 🔹 FUNCIONES
// --------------------------
function mostrarAlerta(texto) {
    mensaje.innerText = texto;
    mensaje.style.display = "block";
    setTimeout(() => mensaje.style.display = "none", 3000);
}

function actualizarCarrito() {
    listaCarrito.innerHTML = "";
    let total = 0;
    carrito.forEach(item => {
        total += item.coins * item.cantidad;
        const li = document.createElement("li");
        li.innerHTML = `${item.nombre} x${item.cantidad} <strong>${item.coins * item.cantidad}</strong>`;
        listaCarrito.appendChild(li);
    });
    coinsActuales.innerText = coinsUsuario - total;
}

// --------------------------
// 🔹 BUSCAR USUARIO
// --------------------------
buscarBtn.onclick = async () => {
    const cedula = cedulaInput.value.trim();
    if (!cedula) return;

    cedulaGlobal = cedula;
    infoUsuario.style.display = "none";
    productosContainer.innerHTML = "";
    listaCarrito.innerHTML = "";
    carrito = [];

    const userSnap = await getDoc(doc(db,"usuarios",cedula));
    if(!userSnap.exists()){
        mostrarAlerta("❌ Usuario no encontrado");
        return;
    }

    const data = userSnap.data();
    nombre.innerText = data.nombre;
    coinsUsuario = data.coins_actuales || 0;
    coinsActuales.innerText = coinsUsuario;
    cedis.innerText = data.cedis || "-";
    infoUsuario.style.display = "block";

    // 🔹 Cargar productos disponibles
    const productosSnap = await getDocs(collection(db,"productos"));
    productosSnap.forEach(p => {
        const prod = p.data();
        const card = document.createElement("div");
        card.className = "producto-card";
        card.innerHTML = `
            <img src="${prod.imagen || 'assets/productos/placeholder.png'}">
            <h4>${prod.nombre}</h4>
            <p>${prod.coins} coins</p>
            <button>Agregar</button>
        `;
        card.querySelector("button").onclick = () => {
            const totalCarrito = carrito.reduce((s,i)=>s+i.coins*i.cantidad,0);
            if(prod.coins + totalCarrito > coinsUsuario){
                mostrarAlerta("❌ Coins insuficientes");
                return;
            }
            const ex = carrito.find(i => i.nombre === prod.nombre);
            ex ? ex.cantidad++ : carrito.push({...prod,cantidad:1});
            actualizarCarrito();
        };
        productosContainer.appendChild(card);
    });
};

// --------------------------
// 🔹 SOLICITAR PRODUCTOS
// --------------------------
btnSolicitar.onclick = async () => {
    if(!carrito.length) return mostrarAlerta("Carrito vacío");

    const total = carrito.reduce((s,i)=>s+i.coins*i.cantidad,0);
    if(total > coinsUsuario) return mostrarAlerta("❌ Coins insuficientes");

    const fecha = new Date().toLocaleDateString("es-ES");

    for(const item of carrito){
        // Guardar movimiento en usuario
        const movRef = doc(collection(db,"usuarios",cedulaGlobal,"movimientos"));
        await setDoc(movRef,{
            fecha,
            producto:item.nombre,
            coins_canjeados:item.coins*item.cantidad,
            coins_actuales:coinsUsuario - total,
            tipo:"canje"
        });

        // Guardar canje global para admin
        const canjeRef = doc(collection(db,"canjes_globales"));
        await setDoc(canjeRef,{
            fecha,
            cedula:cedulaGlobal,
            nombre:nombre.innerText,
            producto:item.nombre,
            coins_canjeados:item.coins*item.cantidad,
            saldo_final:coinsUsuario - total
        });
    }

    // Actualizar coins del usuario
    await setDoc(doc(db,"usuarios",cedulaGlobal),{
        coins_actuales:coinsUsuario - total
    },{merge:true});

    coinsUsuario -= total;
    carrito=[];
    actualizarCarrito();
    mostrarAlerta("✅ Productos solicitados correctamente");
};

// --------------------------
// 🔹 HISTORIAL DE PRODUCTOS
// --------------------------
btnHistorial.onclick = async () => {
    seccionHistorial.style.display = "block";
    tablaHistorial.innerHTML = "";

    const snap = await getDocs(collection(db,"usuarios",cedulaGlobal,"movimientos"));
    snap.forEach(m=>{
        const d = m.data();
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${d.fecha}</td>
            <td>${d.producto || "-"}</td>
            <td>${d.coins_canjeados || 0}</td>
            <td>${d.coins_actuales || 0}</td>
        `;
        tablaHistorial.appendChild(tr);
    });
};
