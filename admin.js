import { getDocs, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 🔹 Elementos DOM
const archivoCSV = document.getElementById("archivoCSV");
const btnSubirCoins = document.getElementById("btnSubirCoins");
const estadoSubida = document.getElementById("estadoSubida");
const tablaCanjes = document.getElementById("tablaCanjes");
const btnDescargarCSV = document.getElementById("btnDescargarCSV");

// 🔹 SUBIR CSV DE COINS GANADOS
btnSubirCoins.addEventListener("click", async () => {
  const file = archivoCSV.files[0];
  if(!file) return estadoSubida.innerText = "⚠️ Selecciona un archivo CSV";

  estadoSubida.innerText = "⏳ Procesando archivo...";

  const reader = new FileReader();
  reader.onload = async (e) => {
    const lines = e.target.result.split(/\r?\n/);
    let contador = 0;

    for(let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if(!row) continue;

      const cols = row.includes(";") ? row.split(";") : row.split(",");
      if(cols.length < 5) continue;

      const [fecha, cedula, nombre, cedis, coins_ganados_raw] = cols;
      const coins_ganados = Number(coins_ganados_raw);
      if(!cedula || isNaN(coins_ganados)) continue;

      const fechaId = fecha.replace(/\//g,"-");
      const userRef = doc(db, "usuarios", cedula);

      // 🔹 Guardar usuario (merge)
      await setDoc(userRef, { cedula, nombre, cedis }, { merge:true });

      // 🔹 Guardar movimiento por fecha (sobrescribir si existe)
      const movRef = doc(db, "usuarios", cedula, "movimientos", fechaId);
      await setDoc(movRef, {
        fecha,
        coins_ganados,
        coins_canjeados: 0,
        coins_actuales: coins_ganados,
        producto: "",
        tipo: "ganado"
      }, { merge:true });

      // 🔹 Actualizar coins actuales (última fecha)
      await setDoc(userRef, { coins_actuales: coins_ganados }, { merge:true });

      contador++;
    }

    estadoSubida.innerText = `✅ Archivo procesado: ${contador} registros`;
    cargarCanjes();
  };

  reader.readAsText(file);
});

// 🔹 CARGAR CANJES GLOBALES
async function cargarCanjes() {
  tablaCanjes.innerHTML = "";
  const snap = await getDocs(collection(db, "canjes_globales"));

  snap.forEach(docu => {
    const d = docu.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.fecha}</td>
      <td>${d.cedula}</td>
      <td>${d.nombre}</td>
      <td>${d.producto}</td>
      <td>${d.coins_canjeados}</td>
      <td>${d.saldo_final}</td>
    `;
    tablaCanjes.appendChild(tr);
  });
}

// 🔹 DESCARGAR CSV
btnDescargarCSV.addEventListener("click", async () => {
  const rows = [["Fecha","Cédula","Nombre","Producto","Coins canjeados","Saldo final"]];
  const snap = await getDocs(collection(db,"canjes_globales"));

  snap.forEach(docu => {
    const d = docu.data();
    rows.push([d.fecha,d.cedula,d.nombre,d.producto,d.coins_canjeados,d.saldo_final]);
  });

  const csvContent = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `canjes_globales_${Date.now()}.csv`;
  link.click();
});

// 🔹 Ejecutar carga inicial de canjes
cargarCanjes();
