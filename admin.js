import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* =====================================================
   🔥 FIREBASE
===================================================== */
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

/* =====================================================
   ELEMENTOS DOM
===================================================== */
const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");
const tablaBody = document.querySelector("#tablaDatos tbody");

/* =====================================================
   1️⃣ CARGAR HISTORIAL DE CARGAS (ADMIN)
===================================================== */
async function cargarHistorial() {
    tablaBody.innerHTML = "";
    const usuariosSnap = await getDocs(collection(db, "usuarios"));

    usuariosSnap.forEach(async userDoc => {
        const cedula = userDoc.id;
        const userData = userDoc.data();

        const movSnap = await getDocs(
            collection(db, "usuarios", cedula, "movimientos")
        );

        movSnap.forEach(m => {
            const d = m.data();
            if (d.tipo !== "carga") return;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${d.fecha}</td>
                <td>${cedula}</td>
                <td>${userData.nombre}</td>
                <td>${userData.cedis}</td>
                <td>${d.coins}</td>
            `;
            tablaBody.appendChild(tr);
        });
    });
}

cargarHistorial();

/* =====================================================
   2️⃣ SUBIR CSV DE COINS (ACUMULA / SOBREESCRIBE)
===================================================== */
fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async ev => {
        const lines = ev.target.result.split(/\r?\n/);
        let procesados = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].trim();
            if (!row) continue;

            const c = row.includes(";") ? row.split(";") : row.split(",");
            if (c.length < 5) continue;

            const fecha = c[0].trim();
            const fechaId = fecha.replace(/\//g, "-");
            const cedula = c[1].trim();
            const nombre = c[2].trim();
            const cedis = c[3].trim();
            const coins = Number(c[4]);

            if (!cedula || isNaN(coins)) continue;

            const userRef = doc(db, "usuarios", cedula);
            const movRef = doc(db, "usuarios", cedula, "movimientos", fechaId);

            await runTransaction(db, async tx => {
                const userSnap = await tx.get(userRef);
                const movSnap = await tx.get(movRef);

                let saldoActual = 0;
                if (userSnap.exists()) {
                    saldoActual = userSnap.data().coins_actuales || 0;
                }

                let ajuste = coins;

                // 🔁 si ya existe carga en esa fecha → revertimos antes
                if (movSnap.exists()) {
                    ajuste = coins - movSnap.data().coins;
                }

                tx.set(userRef, {
                    nombre,
                    cedis,
                    coins_actuales: saldoActual + ajuste
                }, { merge: true });

                tx.set(movRef, {
                    tipo: "carga",
                    fecha,
                    coins
                });
            });

            procesados++;
        }

        status.innerText = `✅ CSV procesado correctamente (${procesados} registros)`;
        cargarHistorial();
    };

    reader.readAsText(file);
});

/* =====================================================
   3️⃣ TABLA DE CANJES + DESCARGA CSV
===================================================== */
const tablaCanjes = document.getElementById("tablaCanjes");
const btnDescargar = document.getElementById("descargarCanjes");

async function cargarCanjes() {
    tablaCanjes.innerHTML = "";
    const usuariosSnap = await getDocs(collection(db, "usuarios"));

    let dataCSV = [
        ["Fecha","Cédula","Nombre","Producto","Coins"]
    ];

    for (const u of usuariosSnap.docs) {
        const cedula = u.id;
        const nombre = u.data().nombre;

        const movSnap = await getDocs(
            collection(db,"usuarios",cedula,"movimientos")
        );

        movSnap.forEach(m => {
            const d = m.data();
            if (d.tipo !== "canje") return;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${d.fecha}</td>
                <td>${cedula}</td>
                <td>${nombre}</td>
                <td>${d.producto}</td>
                <td>${d.coins}</td>
            `;
            tablaCanjes.appendChild(tr);

            dataCSV.push([
                d.fecha, cedula, nombre, d.producto, d.coins
            ]);
        });
    }

    // descargar CSV
    btnDescargar.onclick = () => {
        const csv = dataCSV.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type:"text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "canjes_ajecoins.csv";
        a.click();
        URL.revokeObjectURL(url);
    };
}

cargarCanjes();
