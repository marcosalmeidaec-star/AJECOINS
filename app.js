let coins = 1000; // coins iniciales de prueba

function login() {
  document.getElementById("login").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("coinsActuales").innerText = coins;
}

function canjear(valor, articulo) {
  if (coins >= valor) {
    coins -= valor;
    document.getElementById("coinsActuales").innerText = coins;
    alert("Canje exitoso: " + articulo);
  } else {
    alert("No tienes suficientes coins");
  }
}
