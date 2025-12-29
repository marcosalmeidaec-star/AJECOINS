/*************************
 * LOGIN
 *************************/
function login() {
  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value.trim();

  // ADMIN
  if (user === "admin" && pass === "admin123") {
    window.location.href = "admin.html";
    return;
  }

  // USUARIO (cedula = contraseña)
  if (user !== "" && user === pass) {
    localStorage.setItem("usuario_actual", user);
    window.location.href = "usuario.html";
    return;
  }

  alert("Credenciales incorrectas");
}

/*************************
 * ADMIN - PROCESAR EXCEL
 *************************/
function procesarExcel() {
  const fileInput = document.getElementById("excelFile");
  if (!fileInput || fileInput.files.length === 0) {
    alert("Selecciona un archivo Excel");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let baseCoins = {};

    rows.forEach(r => {
      if (!r.cedula || !r.coins_ganados) return;

      baseCoins[String(r.cedula)] = {
        fecha: r.fecha || "",
        vendedor: r.vendedor || "",
        cedis: r.cedis || "",
        coins_ganados: Number(r.coins_ganados),
        coins_usados: 0,
        coins_actuales: Number(r.coins_ganados)
      };
    });

    localStorage.setItem("baseCoins", JSON.stringify(baseCoins));
    document.getElementById("resultado").innerText =
      "Excel cargado correctamente (" + Object.keys(baseCoins).length + " usuarios)";
  };

  reader.readAsArrayBuffer(file);
}

/*************************
 * USUARIO - MOSTRAR COINS
 *************************/
const usuario = localStorage.getItem("usuario_actual");
const baseCoins = JSON.parse(localStorage.getItem("baseCoins")) || {};

if (usuario && baseCoins[usuario]) {
  const p = document.getElementById("coins");
  if (p) {
    p.innerText = "Coins actuales: " + baseCoins[usuario].coins_actuales;
  }
}

/*************************
 * CANJEAR COINS
 *************************/
function canjear(valor) {
  if (!usuario || !baseCoins[usuario]) {
    alert("Usuario no encontrado");
    return;
  }

  if (baseCoins[usuario].coins_actuales < valor) {
    alert("No tienes coins suficientes");
    return;
  }

  baseCoins[usuario].coins_actuales -= valor;
  baseCoins[usuario].coins_usados += valor;

  localStorage.setItem("baseCoins", JSON.stringify(baseCoins));
  alert("Canje realizado con éxito");
  location.reload();
}

/*************************
 * CERRAR SESIÓN
 *************************/
function cerrarSesion() {
  localStorage.removeItem("usuario_actual");
  window.location.href = "index.html";
}
