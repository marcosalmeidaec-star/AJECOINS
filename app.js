// ===============================
// LOGIN
// ===============================
function login() {
  const user = document.getElementById("user").value;
  const pass = document.getElementById("pass").value;

  if (user === "admin" && pass === "admin123") {
    window.location.href = "admin.html";
    return;
  }

  if (user === pass && user !== "") {
    localStorage.setItem("usuario_actual", user);
    window.location.href = "usuario.html";
    return;
  }

  alert("Credenciales incorrectas");
}

// ===============================
// ADMIN - PROCESAR EXCEL
// ===============================
function procesarExcel() {
  const file = document.getElementById("excelFile").files[0];
  if (!file) {
    alert("Selecciona un Excel");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let baseCoins = {};
    const tbody = document.querySelector("#tablaDatos tbody");
    tbody.innerHTML = "";

    rows.forEach(r => {
      if (!r.cedula) return;

      baseCoins[r.cedula] = {
        fecha: r.fecha,
        cedula: r.cedula,
        vendedor: r.vendedor,
        cedis: r.cedis,
        coins_ganados: Number(r.coins_ganados),
        coins_usados: 0,
        coins_actuales: Number(r.coins_ganados)
      };

      // 🔹 pintar tabla
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.fecha || ""}</td>
        <td>${r.cedula}</td>
        <td>${r.vendedor || ""}</td>
        <td>${r.cedis || ""}</td>
        <td>${r.coins_ganados}</td>
      `;
      tbody.appendChild(tr);
    });

    localStorage.setItem("baseCoins", JSON.stringify(baseCoins));
    document.getElementById("resultado").innerText =
      "Excel cargado correctamente. Registros: " + rows.length;
  };

  reader.readAsArrayBuffer(file);
}

// ===============================
// USUARIO - MOSTRAR COINS
// ===============================
const usuario = localStorage.getItem("usuario_actual");
const baseCoins = JSON.parse(localStorage.getItem("baseCoins")) || {};

if (usuario && baseCoins[usuario]) {
  const p = document.getElementById("coins");
  if (p) {
    p.innerText = "Coins actuales: " + baseCoins[usuario].coins_actuales;
  }
}

// ===============================
// CANJEAR
// ===============================
function canjear(valor) {
  if (!baseCoins[usuario] || baseCoins[usuario].coins_actuales < valor) {
    alert("No tienes coins suficientes");
    return;
  }

  baseCoins[usuario].coins_actuales -= valor;
  baseCoins[usuario].coins_usados += valor;

  localStorage.setItem("baseCoins", JSON.stringify(baseCoins));
  alert("Canje realizado con éxito");
  location.reload();
}
