let coinsActuales = 0;

function leerExcel() {
  const input = document.getElementById("excelInput");
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, {type: 'array'});
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja);

    let totalCoins = 0;
    filas.forEach(f => {
      totalCoins += Number(f.coins_ganados || 0);
    });

    coinsActuales = totalCoins;
    document.getElementById("resultado").innerHTML =
      `<h3>Coins actuales: ${coinsActuales}</h3>`;
  };
  reader.readAsArrayBuffer(file);
}

function canjear(valor, articulo) {
  if (coinsActuales < valor) {
    alert("No tienes coins suficientes");
    return;
  }
  coinsActuales -= valor;
  alert(`Canjeaste ${articulo}`);
  document.getElementById("resultado").innerHTML =
    `<h3>Coins actuales: ${coinsActuales}</h3>`;
}
