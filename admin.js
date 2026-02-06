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

/* =================== VARIABLES DE CACHE =================== */
let cacheUsuarios = [];
let cacheCompras = [];
let cacheMovimientos = [];

/* =================== UTILIDADES =================== */
function normalizarFecha(fecha) {
  if (!fecha || typeof fecha !== "string" || fecha.trim() === "") return "2026-01-01";
  if (fecha.includes("-")) return fecha;
  const partes = fecha.split("/");
  if (partes.length < 3) return fecha;
  const [d, m, y] = partes;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
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
  if (loader) loader.classList.toggle('active', show);
}

/* =================== ELIMINAR USUARIO (POR SEDE) =================== */
window.eliminarUsuarioTotal = async (codVendedor, cedis) => {
  if (!confirm(`⚠️ ¿ELIMINAR acceso y coins del vendedor ${codVendedor} en ${cedis}?`)) return;
  toggleLoader(true);
  
  // ID único de credencial: cod_cedis
  const loginId = `${codVendedor}_${cedis}`;
  
  try {
    // 1. Eliminar credencial de acceso
    await deleteDoc(doc(db, "credenciales", loginId));
    
    // 2. Eliminar todos sus registros de carga en esa sede
    const qCargas = query(collection(db, "usuariosPorFecha"), 
                          where("codVendedor", "==", codVendedor),
                          where("cedis", "==", cedis));
    const snapCargas = await getDocs(qCargas);
    for (const d of snapCargas.docs) { await deleteDoc(doc(db, "usuariosPorFecha", d.id)); }
    
    alert(`Usuario ${codVendedor} de ${cedis} eliminado completamente.`);
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

      // ID UNICO de carga: fecha_cod_cedis para evitar que sedes distintas se pisen
      const cargaId = `${fechaNormal}_${codVendedor}_${cedisLimpio.replace(/\s/g, "")}`;

      await setDoc(doc(db, "usuariosPorFecha", cargaId), {
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
  // Llave única combinada para la lista maestra
  lista.forEach(u => { 
    const key = `${u.codVendedor}_${u.cedis}`;
    if(!unicos[key]) unicos[key] = u; 
  });

  Object.values(unicos).forEach(u => {
    maestraBody.innerHTML += `
      <tr>
        <td>${u.codVendedor}</td>
        <td>${u.nombre}</td>
        <td>${u.cedis}</td>
        <td style="text-align:center;">
          <button class="btn-eliminar" onclick="eliminarUsuarioTotal('${u.codVendedor}', '${u.cedis}')" style="width:auto; background:#d9534f;">Eliminar Todo</button>
        </td>
      </tr>`;
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

/* =================== MOVIMIENTOS (FILTRO CEDIS) =================== */
document.getElementById("btnVerMov").onclick = async () => {
  const cod = document.getElementById("movCedula").value.trim();
  const cedis = prompt("Ingrese el CEDIS del usuario (Obligatorio para diferenciar):");
  
  if(!cod || !cedis) return alert("Código y CEDIS son necesarios");
  
  toggleLoader(true);
  try {
    cacheMovimientos = await obtenerMovimientos(cod, cedis.toUpperCase());
    renderMov(cacheMovimientos);
  } finally {
    toggleLoader(false);
  }
};

async function obtenerMovimientos(cod, cedis) {
  let mov = []; let saldo = 0;
  
  // Filtrar cargas por código y sede
  const qIng = query(collection(db, "usuariosPorFecha"), where("codVendedor", "==", cod), where("cedis", "==", cedis));
  const ing = await getDocs(qIng);
  ing.forEach(d => { 
    const u = d.data(); 
    mov.push({ cod: u.codVendedor, nom: u.nombre, fec: u.fecha, con: `Carga (${u.cedis})`, cns: u.coins_ganados }); 
  });

  // Filtrar compras por código y sede
  const qCom = query(collection(db, "compras"), where("codVendedor", "==", cod), where("cedis", "==", cedis));
  const com = await getDocs(qCom);
  com.forEach(d => { 
    const c = d.data(); 
    mov.push({ cod: c.codVendedor, nom: c.nombre, fec: c.fecha.toDate().toISOString().slice(0, 10), con: "Canje", cns: -c.total }); 
  });

  mov.sort((a, b) => new Date(a.fec) - new Date(b.fec)).forEach(m => { 
    saldo += m.cns; 
    m.sld = saldo; 
  });
  return mov;
}

// ... (Las funciones de exportar CSV, compras y productos se mantienen igual, solo asegúrate que la carga de productos use loadProducts)

/* =================== INICIAR TODO =================== */
loadUsers(); loadProducts(); loadCompras();
