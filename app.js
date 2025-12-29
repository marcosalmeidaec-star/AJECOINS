/***********************
 LOGIN
************************/
function login() {
  const userInput = document.getElementById("user");
  const passInput = document.getElementById("pass");

  if (!userInput || !passInput) return;

  const user = userInput.value;
  const pass = passInput.value;
  const tipo = localStorage.getItem("tipo_login");

  if (tipo === "admin") {
    if (user === "admin" && pass === "admin123") {
      window.location.href = "admin.html";
    } else {
      alert("Admin incorrecto");
    }
    return;
  }

  if (tipo === "usuario") {
    if (user === pass && user !== "") {
      localStorage.setItem("usuario_actual", user);
      window.location.href = "usuario.html";
    } else {
      alert("Credenciales incorrectas");
    }
  }
}

/***********************
 ADMIN – PROCESAR EXCEL
************************/
function procesarExcel() {
  const input = document.getElementById("excelFile");
  if (!input || !input.files.length) {
    alert("Selecciona un Excel");
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let baseCoins = {};

    rows.forEach(r => {
      if (!r.cedula) return;

      baseCoins[r.cedula] = {
        fecha: r.fecha,
        vendedor: r.vendedor,
        cedis: r.cedis,
        coins_ganados: Number(r.coins_ganados),
        coins_usados: 0,
        coins_actuales: Number(r.coins_ganados),
        canjes: []
      };
    });

    localStorage.setItem("baseCoins", JSON.stringify(baseCoins));

    const res = document.getElementById("resultado");
    if (res) res.innerText = "Excel cargado correctamente ✔";
  };

  reader.readAsArrayBuffer(file);
}

/***********************
 USUARIO – MOSTRAR COINS
************************/
(function mostrarCoins() {
  const p = document.getElementById("coins");
  if (!p) return;

  const usuario = localStorage.getItem("usuario_actual");
  const baseCoins = JSON.parse(localStorage.getItem("baseCoins")) || {};

  if (!usuario || !baseCoins[usuario]) {
    p.innerText = "Usuario sin datos";
    return;
  }

  p.innerText = "Coins actuales: " + baseCoins[usuario].coins_actuales;
})();

/***********************
 CANJEAR
************************/
function canjear(valor, articulo) {
  const usuario = localStorage.getItem("usuario_actual");
  let baseCoins = JSON.parse(localStorage.getItem("baseCoins")) || {};

  if (!baseCoins[usuario]) {
    alert("Usuario no encontrado");
    return;
  }

  if (baseCoins[usuario].coins_actuales < valor) {
    alert("No tienes coins suficientes");
    return;
  }

  baseCoins[usuario].coins_actuales -= valor;
  baseCoins[usuario].coins_usados += valor;
  baseCoins[usuario].canjes.push({
    articulo,
    valor,
    fecha: new Date().toISOString()
  });

  localStorage.setItem("baseCoins", JSON.stringify(baseCoins));
  alert("Canje exitoso ✔");
  location.reload();
}
