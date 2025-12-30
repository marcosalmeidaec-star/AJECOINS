import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

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

document.getElementById("fileInput").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

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

            const fecha = cols[0];
            const cedula = cols[1];
            const nombre = cols[2];
            const cedis = cols[3];
            const coinsGanados = Number(cols[4]);

            if (!cedula || isNaN(coinsGanados)) continue;

            // 🔹 1️⃣ Crear / actualizar usuario
            const userRef = doc(db, "usuarios", cedula);
            await setDoc(userRef, {
                cedula,
                nombre,
                cedis
            }, { merge: true });

            // 🔹 2️⃣ Crear movimiento (histórico)
            const movimientosRef = collection(db, "usuarios", cedula, "movimientos");

            await addDoc(movimientosRef, {
                fecha,
                coins_ganados: coinsGanados,
                producto: "",
                coins_canjeados: 0,
                coins_actuales: coinsGanados
            });

            contador++;
        }

        document.getElementById("status").innerText =
            `✅ Archivo cargado en Firebase. Registros procesados: ${contador}`;
    };

    reader.readAsText(file);
});
