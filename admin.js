import { collection, doc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 🔹 ELEMENTOS DOM
const archivoCSV = document.getElementById("archivoCSV");
const btnSubirCoins = document.getElementById("btnSubirCoins");
const estadoSubida = document.getElementById("estadoSubida");

const productosInput = document.getElementById("productosInput");
const productosStatus = document.getElementById("productosStatus");
const tablaProductosBody = document.querySelector("#tablaProductos tbody");

const tablaUsuariosBody = document.querySelector("#tablaUsuarios tbody");
const tablaCanjes = document.getElementById("tablaCanjes");
const btnDescargarCSV = document.getElementById("btnDescargarCSV");

// --------------------------
// 🔹 FUNCIONES DE CARGA
// --------------------------

// 🔹 Cargar usuarios con coins actuales
async function cargarUsuarios() {
  tablaUsuariosBody.innerHTML = "";
  const snap = await getDocs(collection(db, "usuarios"));
  snap.forEach(docu => {
    const d = docu.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d.cedula}</td><td>${d.nombre}</td><td>${d.cedis || '-'}</td><td>${d.coins_actuales || 0}</td>`;
    tablaUsuariosBody.appendChild(tr);
  });
}

// 🔹 Cargar productos existentes
async function cargarProductos() {
    tablaProductosBody.innerHTML = "";
    const snap = await getDocs(collection(db, "productos"));
    snap.forEach(docu => {
        const d = docu.data();
        const imgSrc = d.imagen || 'assets/productos/placeholder.png';
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${d.nombre}</td><td>${d.coins}</td><td><img src="${imgSrc}" width="50"></td>`;
        tablaProductosBody.appendChild(tr);
    });
    productosStatus.innerText = `🛒 Productos cargados: ${snap.size}`;
}

// 🔹 Cargar canjes globales
async function cargarCanjes() {
  tablaCanjes.innerHTML = "";
  const snap = await getDocs(collection(db,"canjes_globales"));
  snap.forEach(docu=>{
    const d = docu.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d.fecha}</td><td>${d.cedula}</td><td>${d.nombre}</td>
                    <td>${d.producto}</td><td>${d.coins_canjeados}</td><td>${d.saldo_final}</td>`;
    tablaCanjes.appendChild(tr);
  });
}

// --------------------------
// 🔹 SUBIR CSV DE COINS
// --------------------------
btnSubirCoins.addEventListener("click", async () => {
  const file = archivoCSV.files[0];
  if(!file) return estadoSubida.innerText = "⚠️ Selecciona un archivo CSV";

  estadoSubida.innerText = "⏳ Procesando archivo...";

  const reader = new FileReader();
  reader.onload = async (e) => {
    const lines = e.target.result.split(/\r?\n/).filter(l=>l.trim()!=="");
    const registros = [];

    for(let i=1;i<lines.length;i++){
      const cols = lines[i].includes(";") ? lines[i].split(";") : lines[i].split(",");
      if(cols.length < 5) continue;
      const [fecha, cedula, nombre, cedis, coinsRaw] = cols;
      const coins_ganados = Number(coinsRaw);
      if(!cedula || isNaN(coins_ganados)) continue;
      registros.push({fecha,cedula,nombre,cedis,coins_ganados});
    }

    await Promise.all(registros.map(async r=>{
      const userRef = doc(db,"usuarios",r.cedula);
      const fechaId = r.fecha.replace(/\//g,"-");
      const movRef = doc(db,"usuarios",r.cedula,"movimientos",fechaId);

      // Guardar usuario (merge)
      await setDoc(userRef,{cedula:r.cedula,nombre:r.nombre,cedis:r.cedis},{merge:true});

      // Guardar movimiento (sobrescribe si existe)
      await setDoc(movRef,{
        fecha:r.fecha,
        coins_ganados:r.coins_ganados,
        coins_canjeados:0,
        coins_actuales:r.coins_ganados,
        producto:"",
        tipo:"ganado"
      },{merge:true});

      // Actualizar coins actuales del usuario
      await setDoc(userRef,{coins_actuales:r.coins_ganados},{merge:true});
    }));

    estadoSubida.innerText = `✅ Archivo procesado: ${registros.length} registros`;

    // 🔹 Refrescar tablas
    await cargarUsuarios();
    await cargarCanjes();
  };
  reader.readAsText(file);
});

// --------------------------
// 🔹 SUBIR CSV DE PRODUCTOS (productos, coins)
// --------------------------
productosInput?.addEventListener("change", async e => {
    const file = e.target.files[0];
    if(!file) return;

    tablaProductosBody.innerHTML = "";
    const reader = new FileReader();
    reader.onload = async ev => {
        const lines = ev.target.result.split(/\r?\n/).filter(l=>l.trim()!=="");
        const registros = [];

        for(let i=1;i<lines.length;i++){
            const cols = lines[i].includes(";") ? lines[i].split(";") : lines[i].split(",");
            if(cols.length < 2) continue;
            const nombre = cols[0].trim();
            const coins = Number(cols[1]);
            if(!nombre || isNaN(coins)) continue;

            const id = nombre.toLowerCase().replace(/\s+/g,"_");
            const imagen = `assets/productos/placeholder.png`;
            registros.push({id,nombre,coins,imagen});
        }

        await Promise.all(registros.map(r => setDoc(doc(db,"productos",r.id),r,{merge:true})));
        cargarProductos();
        productosStatus.innerText = `🛒 Productos cargados: ${registros.length}`;
    };
    reader.readAsText(file);
});

// --------------------------
// 🔹 DESCARGAR CSV DE CANJES
// --------------------------
btnDescargarCSV?.addEventListener("click", async ()=>{
  const rows=[["Fecha","Cédula","Nombre","Producto","Coins canjeados","Saldo final"]];
  const snap = await getDocs(collection(db,"canjes_globales"));
  snap.forEach(docu=>{
    const d = docu.data();
    rows.push([d.fecha,d.cedula,d.nombre,d.producto,d.coins_canjeados,d.saldo_final]);
  });
  const csv = rows.map(r=>r.join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `canjes_globales_${Date.now()}.csv`;
  link.click();
});

// --------------------------
// 🔹 CARGAR DATOS AL INICIAR PAGINA
// --------------------------
cargarUsuarios();
cargarProductos();
cargarCanjes();
