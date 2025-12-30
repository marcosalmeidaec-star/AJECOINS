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
// 🔹 1. CARGAR DATOS EXISTENTES AL ENTRAR AL ADMIN
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

// 🔹 Ejecutar automáticamente
cargarDatosExistentes();


// ===================================================
// 🔹 2. CARGA DE CSV (ADMIN)
// ===================================================
document.getElementById("fileInput").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    tablaBody.innerHTML = ""; // limpiar tabla
    const reader = new FileReader();

    reader.onload = async function (event) {
        const text = event.target.result;
        const lines = text.split(/\r?\n/);
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

            // 🔹 Usuario (datos fijos)
            await setDoc(
                doc(db, "usuarios", cedula),
                { cedula, nombre, cedis },
                { merge: true }
            );

            // 🔹 Movimiento POR FECHA (sobrescribe)
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

            // 🔹 Mostrar en tabla
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

        status.innerText =
            `✅ Archivo cargado. Registros procesados: ${contador}`;
    };

    reader.readAsText(file);
});
