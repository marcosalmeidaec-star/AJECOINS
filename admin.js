import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    getDocs
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

const tablaBody = document.querySelector("#tablaDatos tbody");
const status = document.getElementById("status");

// ===================================================
// 🔹 1. CARGAR DATOS EXISTENTES
// ===================================================
async function cargarDatosExistentes() {
    tablaBody.innerHTML = "";
    status.innerText = "⏳ Cargando datos existentes...";

    const usuariosSnap = await getDocs(collection(db, "usuarios"));
    let total = 0;

    for (const userDoc of usuariosSnap.docs) {
        const userData = userDoc.data();
        const cedula = userDoc.id;

        const movimientosSnap = await getDocs(
            collection(db, "usuarios", cedula, "movimientos")
        );

        movimientosSnap.forEach(mov => {
            const data = mov.data();

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${data.fecha}</td>
                <td>${cedula}</td>
                <td>${userData.nombre}</td>
                <td>${userData.cedis}</td>
                <td>${data.coins_ganados}</td>
            `;
            tablaBody.appendChild(tr);
            total++;
        });
    }

    status.innerText =
        total > 0
            ? `📦 Registros cargados desde Firebase: ${total}`
            : "ℹ️ No hay datos cargados aún";
}

cargarDatosExistentes();

// ===================================================
// 🔹 2. CARGA CSV DE COINS (USUARIOS)
// ===================================================
document.getElementById("fileInput").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    tablaBody.innerHTML = "";
    const reader = new FileReader();

    reader.onload = async function (event) {
        const lines = event.target.result.split(/\r?\n/);
        let contador = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].trim();
            if (!row) continue;

            const cols = row.includes(";") ? row.split(";") : row.split(",");
            if (cols.length < 5) continue;

            const fechaRaw = cols[0];
            const fechaId = fechaRaw.replace(/\//g, "-");
            const cedula = cols[1];
            const nombre = cols[2];
            const cedis = cols[3];
            const coins = Number(cols[4]);

            if (!cedula || isNaN(coins)) continue;

            await setDoc(
                doc(db, "usuarios", cedula),
                { cedula, nombre, cedis },
                { merge: true }
            );

            await setDoc(
                doc(db, "usuarios", cedula, "movimientos", fechaId),
                {
                    fecha: fechaRaw,
                    coins_ganados: coins,
                    producto: "",
                    coins_canjeados: 0,
                    coins_actuales: coins
                }
            );

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${fechaRaw}</td>
                <td>${cedula}</td>
                <td>${nombre}</td>
                <td>${cedis}</td>
                <td>${coins}</td>
            `;
            tablaBody.appendChild(tr);

            contador++;
        }

        status.innerText = `✅ Archivo cargado. Registros procesados: ${contador}`;
    };

    reader.readAsText(file);
});

// ===================================================
// 🔹 3. CARGA CSV DE PRODUCTOS (CATÁLOGO)
// ===================================================
const productosInput = document.getElementById("productosInput");
const productosStatus = document.getElementById("productosStatus");
const tablaProductosBody = document.querySelector("#tablaProductos tbody");

// 🔹 Función para cargar productos desde Firestore al iniciar la página
async function cargarProductos() {
    tablaProductosBody.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "productos"));
    let contador = 0;

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${data.nombre}</td>
            <td>${data.coins}</td>
            <td><img src="${data.imagen}" width="50"></td>
        `;
        tablaProductosBody.appendChild(tr);
        contador++;
    });

    productosStatus.innerText = `🛒 Productos cargados: ${contador}`;
}

// 🔹 Ejecutar al iniciar la página
cargarProductos();

// 🔹 Manejar carga de CSV de productos
productosInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    tablaProductosBody.innerHTML = "";
    const reader = new FileReader();

    reader.onload = async function (event) {
        const lines = event.target.result.split(/\r?\n/);
        let contador = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].trim();
            if (!row) continue;

            const cols = row.includes(";") ? row.split(";") : row.split(",");
            if (cols.length < 2) continue;

            const nombre = cols[0].trim();
            const coins = Number(cols[1]);

            if (!nombre || isNaN(coins)) continue;

            const id = nombre.toLowerCase().replace(/\s+/g, "_");
            const imagen = `assets/productos/${id}.jpg`; // Cambiado a jpg

            await setDoc(doc(db, "productos", id), {
                nombre,
                coins,
                imagen,
                activo: true
            });

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${nombre}</td>
                <td>${coins}</td>
                <td><img src="${imagen}" width="50"></td>
            `;
            tablaProductosBody.appendChild(tr);

            contador++;
        }

        productosStatus.innerText = `🛒 Productos cargados: ${contador}`;
    };

    reader.readAsText(file);
});
