import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, writeBatch } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 🔹 Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCsz2EP8IsTlG02uU2_GRfyQeeajMDuJjI",
  authDomain: "ajecoins-73829.firebaseapp.com",
  projectId: "ajecoins-73829",
  storageBucket: "ajecoins-73829.appspot.com",
  messagingSenderId: "247461322350",
  appId: "1:247461322350:web:802185ad39249ca650507f"
};

// 🔹 Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔹 Detectar separador CSV/TSV
function detectSeparator(text) {
  const firstLine = text.split("\n")[0];
  if (firstLine.includes("\t")) return "\t";
  if (firstLine.includes(";")) return ";";
  return ",";
}

// 🔹 Subir CSV/TSV
async function handleFileUpload(file, tipo) {
  if (!file) return;
  const loader = document.getElementById("loading");
  loader.style.display = "block";

  try {
    const text = await file.text();
    const separator = detectSeparator(text);
    const lines = text.split("\n").map(l => l.trim()).filter(l => l);
    if (lines.length < 2) throw new Error("Archivo vacío o sin datos");

    const batch = writeBatch(db);

    if (tipo === "usuarios") {
      const data = lines.slice(1).map(line => {
        const values = line.split(separator).map(v => v.trim());
        return {
          fecha: values[0] || "",
          cedula: values[1] || "",
          nombre: values[2] || "",
          cedis: values[3] || "",
          coins_ganados: parseInt(values[4]) || 0
        };
      }).filter(u => u.cedula);

      data.forEach(u => {
        const docRef = doc(db, "usuarios", u.cedula);
        batch.set(docRef, u);
      });
      await batch.commit();
      alert("✅ Usuarios cargados correctamente");
      loadUsuarios();

    } else if (tipo === "productos") {
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(separator).map(v => v.trim());
        return {
          id: `prod_${index+1}`,
          nombre: values[0] || "",
          coins: parseInt(values[1]) || 0
        };
      }).filter(p => p.nombre);

      data.forEach(p => {
        const docRef = doc(db, "productos", p.id);
        batch.set(docRef, p);
      });
      await batch.commit();
      alert("✅ Productos cargados correctamente");
      loadProductos();
    }

  } catch (err) {
    console.error(err);
    alert("❌ Error al procesar el archivo. Verifica el formato CSV/TSV");
  }

  loader.style.display = "none";
}

// 🔹 Cargar usuarios
async function loadUsuarios() {
  const table = document.getElementById("usuarios-body");
  table.innerHTML = "";
  try {
    const snapshot = await getDocs(collection(db, "usuarios"));
    snapshot.forEach(doc => {
      const u = doc.data();
      const row = `<tr>
        <td>${u.fecha}</td>
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td>${u.cedis}</td>
        <td>${u.coins_ganados}</td>
      </tr>`;
      table.innerHTML += row;
    });
  } catch (err) {
    console.error(err);
    alert("Error cargando usuarios desde Firebase");
  }
}

// 🔹 Cargar productos con imagen
async function loadProductos() {
  const table = document.getElementById("productos-body");
  table.innerHTML = "";
  try {
    const snapshot = await getDocs(collection(db, "productos"));
    snapshot.forEach(doc => {
      const p = doc.data();
      // 🔹 Ruta relativa para GitHub Pages
      const imgSrc = `assets/productos/${p.nombre}.png`;

      const row = `<tr>
        <td><img src="${imgSrc}" alt="${p.nombre}" width="50" height="50"></td>
        <td>${p.nombre}</td>
        <td>${p.coins}</td>
      </tr>`;
      table.innerHTML += row;
    });
  } catch (err) {
    console.error(err);
    alert("Error cargando productos desde Firebase");
  }
}

// 🔹 Event listeners
document.getElementById("file-usuarios").addEventListener("change", e => handleFileUpload(e.target.files[0], "usuarios"));
document.getElementById("file-productos").addEventListener("change", e => handleFileUpload(e.target.files[0], "productos"));
document.getElementById("refresh-btn").addEventListener("click", () => { loadUsuarios(); loadProductos(); });

// 🔹 Cargar datos al inicio
loadUsuarios();
loadProductos();
