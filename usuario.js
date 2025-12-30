// 🔹 Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore,
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

// 🔹 Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔹 Evento botón
document.getElementById("btnConsultar").addEventListener("click", async () => {
    const cedula = document.getElementById("cedulaInput").value.trim();
    const resultado = document.getElementById("resultado");

    if (!cedula) {
        resultado.innerHTML = "⚠️ Ingresa una cédula";
        return;
    }

    try {
        const movimientosRef = collection(db, "usuarios", cedula, "movimientos");
        const snapshot = await getDocs(movimientosRef);

        if (snapshot.empty) {
            resultado.innerHTML = "❌ No se encontraron registros para esta cédula";
            return;
        }

        let totalCoins = 0;
        let nombre = "";
        let cedis = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            nombre = data.nombre;
            cedis = data.cedis;
            totalCoins += Number(data.coins_actuales || 0);
        });

        resultado.innerHTML = `
            <h3>👤 ${nombre}</h3>
            <p><strong>Cédula:</strong> ${cedula}</p>
            <p><strong>CEDIS:</strong> ${cedis}</p>
            <p><strong>Coins disponibles:</strong> ${totalCoins}</p>
        `;
    } catch (error) {
        console.error(error);
        resultado.innerHTML = "❌ Error al consultar datos";
    }
});
