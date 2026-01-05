import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where
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

// 🔹 Elementos DOM
const archivoCSV = document.getElementById("archivoCSV");
const btnSubirCoins = document.getElementById("btnSubirCoins");
const estadoSubida = document.getElementById("estadoSubida");
const tablaCanjes = document.getElementById("tablaCanjes");
const btnDescargarCSV = document.getElementById("btnDescargarCSV");

// ==========================
// 🔹 FUNCIONES AUXILIARES
// ==========================
function mostrarEstado(texto, color = "#2563eb") {
  estadoSubida.innerText = texto;
  estadoSubida.style.color = color;
}

function crearFilaCanje(canje) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${canje.fecha}</td>
    <td>${canje.cedula}</td>
    <td>${canje.nombre}</td>
    <td>${canje.producto}</td>
    <td>${canje.coins_canjeados}</td>
    <td>${canje.saldo_final}</td>
  `;
  tablaCanjes.appendChild(tr);
}

// ==========================
// 🔹 CARGAR COINS DESDE CSV
// ==========================
btnSubirCoins.addEventListener("click", async () => {
  const file = archivoCSV.files[0];
  if (!file) return mostrarEstado("Selecciona un archivo CSV", "#dc2626");

  const reader = new FileReader();
  reader.onload = async (e) => {
    const lines = e.target.result.split(/\r?\n/);
    let procesados = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;

      const cols = row.includes(";") ? row.split(";") : row.split(",");
      if (cols.length < 5) continue;

      const fecha = cols[0].trim();
      const cedula = cols[1].trim();
      const nombre = cols[2].trim();
      const cedis = cols[3].trim();
      const coins_ganados = Number(cols[4].trim());
      if (!cedula || isNaN(coins_ganados)) continue;

      const userRef = doc(db, "usuarios", cedula);
      const movCol = collection(db, "usuarios", cedula, "movimientos");

      // 🔹 Actualizar info usuario
      await setDoc(userRef, { nombre, cedis }, { merge: true });

      // 🔹 Revisar si existe movimiento de la misma fecha y tipo "ganado"
      const q = query(movCol, 
        where("fecha", "==", fecha),
        where("tipo", "==", "ganado")
      );
      const existing = await getDocs(q);

      if (!existing.empty) {
        // Sobrescribir
        for (const docu of existing.docs) {
          await setDoc(doc(db, "usuarios", cedula, "movimientos", docu.id), {
            fecha,
            coins_ganados,
            coins_canjeados: 0,
            producto: "",
            tipo: "ganado"
          }, { merge: true });
        }
      } else {
        // Crear nuevo
        const idMov = `${fecha}_${Date.now()}`;
        await setDoc(doc(db, "usuarios", cedula, "movimientos", idMov), {
          fecha,
          coins_ganados,
          coins_canjeados: 0,
          producto: "",
          tipo: "ganado"
        });
      }

      // 🔹 Recalcular coins_actuales
      const movSnap = await getDocs(movCol);
      let totalGanados = 0;
      let totalCanjeados = 0;
      movSnap.forEach(d => {
        const m = d.data();
        if (m.tipo === "ganado") totalGanados += m.coins_ganados || 0;
        if (m.tipo === "canje") totalCanjeados += m.coins_canjeados || 0;
      });
      const saldo = totalGanados - totalCanjeados;
      await setDoc(userRef, { coins_actuales: saldo }, { merge: true });

      procesados++;
    }

    mostrarEstado(`✅ Procesados: ${procesados}`);
  };

  reader.readAsText(file);
});

// ==========================
// 🔹 CARGAR CANJES EN TABLA
// ==========================
async function cargarCanjes() {
  tablaCanjes.innerHTML = "";
  const canjesSnap = await getDocs(collection(db, "canjes_globales"));
  canjesSnap.forEach(docu => crearFilaCanje(docu.data()));
}

// 🔹 Ejecutar al iniciar
cargarCanjes();

// ==========================
// 🔹 DESCARGAR CSV
// ==========================
btnDescargarCSV.addEventListener("click", async () => {
  const canjesSnap = await getDocs(collection(db, "canjes_globales"));
  const rows = [["fecha", "cedula", "nombre", "producto", "coins_canjeados", "saldo_final"]];
  canjesSnap.forEach(d => {
    const data = d.data();
    rows.push([
      data.fecha,
      data.cedula,
      data.nombre,
      data.producto,
      data.coins_canjeados,
      data.saldo_final
    ]);
  });

  const csvContent = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "canjes_globales.csv";
  link.click();
  URL.revokeObjectURL(url);
});
