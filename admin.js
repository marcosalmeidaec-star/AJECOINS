import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc, deleteDoc,
  query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

/* =================== VARIABLES DE CACHE PARA EXPORTAR =================== */
let cacheUsuarios = [];
let cacheCompras = [];
let cacheMovimientos = [];

/* =================== UTILIDADES CORREGIDAS =================== */
function normalizarFecha(fecha) {
  if (!fecha || typeof fecha !== "string" || fecha.trim() === "") return "2026-01-01";
  if (fecha.includes("-")) return fecha;
  const partes = fecha.split("/");
  if (partes.length < 3) return fecha;
  const [d, m, y] = partes;
  const dia = (d || "01").padStart(2, "0");
  const mes = (m || "01").padStart(2, "0");
  const anio = y || "2026";
  return `${anio}-${mes}-${dia}`;
}

function descargarCSV(nombre, filas) {
  const csv = filas.map(f => f.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
}

function toggleLoader(show) {
  const loader = document.getElementById('loader');
  if (loader) {
    if (show) loader.classList.add('active'); 
    else loader.classList.remove('active');   
  }
}

/* =================== ELIMINAR USUARIO (AHORA POR SEDE) =================== */
window.eliminarUsuarioTotal = async (codVendedor, cedis) => {
  if (!confirm(`⚠️ ¿ELIMINAR acceso y coins del vendedor ${codVendedor} en ${cedis}?`)) return;
  toggleLoader(true);
  try {
    const loginId = `${codVendedor}_${cedis}`;
    await deleteDoc(doc(db, "credenciales", loginId));
    
    const q = query(collection(db, "usuariosPorFecha"), 
                    where("codVendedor", "==", codVendedor),
                    where("cedis", "==", cedis));
    const snapCargas = await getDocs(q);
    for (const d of snapCargas.docs) { await deleteDoc(doc(db, "usuariosPorFecha", d.id)); }
    
    alert(`Usuario ${codVendedor} de ${cedis} eliminado.`);
    loadUsers();
  } catch (err) { 
    alert("Error al eliminar"); 
  } finally {
    toggleLoader(false);
  }
};

/* =================== CARGA CSV USUARIOS =================== */
document.getElementById("uploadBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Selecciona CSV");
  
  toggleLoader(true);
  try {
    const text = await file.text();
    const lines = text.trim().split("\n").slice(1).filter(line => line.trim() !== "");

    for (const line of lines) {
      const data = line.split(";").map(x => x.trim());
      if (data.length < 5) continue; 

      const [fechaRaw, codVendedor, nombre, cedis, coins] = data;
      if (!fechaRaw || !codVendedor || !cedis) continue;
      
      const fechaNormal = normalizarFecha(fechaRaw);
      const cedisLimpio = cedis.toUpperCase();

      const idDoc = `${fechaNormal}_${codVendedor}_${cedisLimpio.replace(/\s+/g, '')}`;

      await setDoc(doc(db, "usuariosPorFecha", idDoc), {
        fecha: fechaNormal, 
        codVendedor, 
        nombre, 
        cedis: cedisLimpio, 
        coins_ganados: Number(String(coins).replace(/,/g, "")) || 0,
        creado: Timestamp.now()
      }, { merge: true });
    }
    alert("Carga de usuarios completada");
    loadUsers();
  } catch (err) {
    alert("Error al procesar el archivo");
  } finally {
    toggleLoader(false);
  }
};

/* =================== TABLAS Y RENDERS =================== */
async function loadUsers() {
  const snap = await getDocs(collection(db, "usuariosPorFecha"));
  cacheUsuarios = [];
  snap.forEach(d => cacheUsuarios.push(d.data()));
  renderListaMaestra(cacheUsuarios);
  renderCargas(cacheUsuarios);
}

function renderListaMaestra(lista) {
  const maestraBody = document.getElementById("maestraBody");
  if (!maestraBody) return;
  maestraBody.innerHTML = "";
  const unicos = {};
  lista.forEach(u => { 
    const key = `${u.codVendedor}_${u.cedis}`;
    if(!unicos[key]) unicos[key] = u; 
  });
  Object.values(unicos).forEach(u => {
    maestraBody.innerHTML += `<tr><td>${u.codVendedor}</td><td>${u.nombre}</td><td>${u.cedis}</td><td style="text-align:center;"><button class="btn-eliminar" onclick="eliminarUsuarioTotal('${u.codVendedor}', '${u.cedis}')" style="width:auto; background:#d9534f;">Eliminar Todo</button></td></tr>`;
  });
}

function renderCargas(lista) {
  const usersBody = document.querySelector("#usersTable tbody");
  if (!usersBody) return;
  usersBody.innerHTML = "";
  lista.sort((a,b) => a.fecha.localeCompare(b.fecha)).forEach(u => {
    usersBody.innerHTML += `<tr><td>${u.fecha}</td><td>${u.codVendedor}</td><td>${u.nombre} (<i>${u.cedis}</i>)</td><td style="text-align:center;">${u.coins_ganados}</td></tr>`;
  });
}

/* =================== EXPORTAR USUARIOS =================== */
document.getElementById("btnExportUsers").onclick = () => {
  if(!cacheUsuarios.length) return alert("No hay datos");
  const filas = [["Fecha", "Codigo Vendedor", "Nombre", "Cedis", "Coins"]];
  cacheUsuarios.forEach(u => filas.push([u.fecha, u.codVendedor, u.nombre, u.cedis, u.coins_ganados]));
  descargarCSV("reporte_usuarios.csv", filas);
};

/* =================== COMPRAS =================== */
async function loadCompras() {
  const snap = await getDocs(collection(db, "compras"));
  cacheCompras = [];
  snap.forEach(d => cacheCompras.push(d.data()));
  const body = document.querySelector("#comprasTable tbody");
  if (!body) return;
  body.innerHTML = "";
  cacheCompras.sort((a,b) => a.fecha.toMillis() - b.fecha.toMillis()).forEach(c => {
    body.innerHTML += `<tr><td>${c.fecha.toDate().toLocaleString()}</td><td>${c.codVendedor}</td><td>${c.nombre}</td><td>${c.items.map(i=>i.nombre).join(", ")}</td><td style="text-align:center;">${c.total}</td></tr>`;
  });
}

document.getElementById("btnExport").onclick = () => {
  if(!cacheCompras.length) return alert("No hay compras");
  const filas = [["Fecha", "Cod Vendedor", "Nombre", "Productos", "Total"]];
  cacheCompras.forEach(c => filas.push([c.fecha.toDate().toLocaleString(), c.codVendedor, c.nombre, c.items.map(i=>i.nombre).join(", "), c.total]));
  descargarCSV("reporte_compras.csv", filas);
};

/* =================== MOVIMIENTOS =================== */
document.getElementById("btnVerMov").onclick = async () => {
  const cod = document.getElementById("movCedula").value.trim();
  const cedis = prompt("Ingrese el CEDIS del vendedor (EJ: QUITO):");
  if(!cod || !cedis) return alert("Código y CEDIS son obligatorios");
  toggleLoader(true);
  try {
    cacheMovimientos = await obtenerMovimientos(cod, cedis.toUpperCase());
    renderMov(cacheMovimientos);
  } finally {
    toggleLoader(false);
  }
};

document.getElementById("btnVerTodosMov").onclick = async () => {
  toggleLoader(true);
  try {
    const snapUsers = await getDocs(collection(db, "usuariosPorFecha"));
    const paresUnicos = [];
    const registrosVistos = new Set();

    snapUsers.forEach(doc => {
        const d = doc.data();
        const key = `${d.codVendedor}_${d.cedis}`;
        if (!registrosVistos.has(key)) {
            registrosVistos.add(key);
            paresUnicos.push({ cod: d.codVendedor, cedis: d.cedis });
        }
    });
    
    let totalMovs = [];
    for (const par of paresUnicos) {
      const m = await obtenerMovimientos(par.cod, par.cedis);
      totalMovs = totalMovs.concat(m);
    }
    cacheMovimientos = totalMovs.sort((a,b) => new Date(a.fec) - new Date(b.fec));
    renderMov(cacheMovimientos);
  } finally {
    toggleLoader(false);
  }
};

async function obtenerMovimientos(cod, cedis) {
  let mov = []; let saldo = 0;
  const qIng = query(collection(db, "usuariosPorFecha"), where("codVendedor", "==", cod), where("cedis", "==", cedis));
  const ing = await getDocs(qIng);
  ing.forEach(d => { const u = d.data(); mov.push({ cod: u.codVendedor, nom: u.nombre, fec: u.fecha, con: `Carga (${u.cedis})`, cns: u.coins_ganados }); });
  
  const qCom = query(collection(db, "compras"), where("codVendedor", "==", cod), where("cedis", "==", cedis));
  const com = await getDocs(qCom);
  com.forEach(d => { const c = d.data(); mov.push({ cod: c.codVendedor, nom: c.nombre, fec: c.fecha.toDate().toISOString().slice(0, 10), con: "Canje", cns: -c.total }); });
  
  mov.sort((a, b) => new Date(a.fec) - new Date(b.fec)).forEach(m => { saldo += m.cns; m.sld = saldo; });
  return mov;
}

function renderMov(lista) {
  const body = document.getElementById("movBody"); 
  if (!body) return;
  body.innerHTML = lista.length ? lista.map(m => `<tr><td>${m.cod}</td><td>${m.nom}</td><td>${m.fec}</td><td>${m.con}</td><td style="color:${m.cns>=0?'green':'red'}; text-align:center;">${m.cns}</td><td style="text-align:center;">${m.sld}</td></tr>`).join('') : "<tr><td colspan='6'>No hay datos</td></tr>";
}

document.getElementById("btnExportMov").onclick = () => {
  if(!cacheMovimientos.length) return alert("No hay movimientos en pantalla");
  const filas = [["Codigo", "Nombre", "Fecha", "Concepto", "Coins", "Saldo"]];
  cacheMovimientos.forEach(m => filas.push([m.cod, m.nom, m.fec, m.con, m.cns, m.sld]));
  descargarCSV("reporte_movimientos.csv", filas);
};

/* =================== PRODUCTOS =================== */
document.getElementById("uploadProductBtn").onclick = async () => {
  const file = document.getElementById("productFileInput").files[0];
  if (!file) return alert("Selecciona CSV de productos");
  
  toggleLoader(true);
  try {
    const text = await file.text();
    const lines = text.trim().split("\n").slice(1).filter(l => l.trim() !== "");
    for (const line of lines) {
      const parts = line.replace(/"/g, "").split(";");
      if (parts.length < 2) continue;
      const [nombre, coins] = parts;
      
      const valorCoins = Number(String(coins).replace(/,/g, "")) || 0; 
      const nombreLimpio = nombre.trim();

      await setDoc(doc(db, "productos", nombreLimpio), { 
        producto: nombreLimpio, 
        coins: valorCoins 
      }, { merge: true });
    }
    alert("Inventario de productos actualizado");
    loadProducts();
  } catch (err) {
    alert("Error al cargar productos");
  } finally {
    toggleLoader(false);
  }
};

async function loadProducts() {
  const snap = await getDocs(collection(db, "productos"));
  const body = document.querySelector("#productsTable tbody");
  if (!body) return;
  body.innerHTML = "";
  snap.forEach(d => { 
    const p = d.data(); 
    body.innerHTML += `<tr><td>${p.producto}</td><td style="text-align:center;"><img src="assets/productos/${p.producto}.png" width="40" onerror="this.src='assets/logo.png'"></td><td style="text-align:center;">${p.coins}</td></tr>`;
  });
}

/* ===================================================
   LÓGICA PARA COLAPSAR SECCIONES (ACORDEÓN)
   =================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const titulosColapsables = document.querySelectorAll('.collapsible');

    titulosColapsables.forEach(titulo => {
        titulo.addEventListener('click', () => {
            const card = titulo.parentElement;
            const indicador = titulo.querySelector('span');
            
            // Alternar clase closed
            card.classList.toggle('closed');
            
            // Cambiar símbolo + / −
            if (card.classList.contains('closed')) {
                indicador.innerText = '+';
            } else {
                indicador.innerText = '−';
            }
        });
    });
});

// Iniciar todo al cargar
loadUsers(); loadProducts(); loadCompras();
