function login() {
    const cedula = document.getElementById("cedula").value;
    localStorage.setItem("cedula_actual", cedula);
    window.location.href = "dashboard.html";
}

if (window.location.pathname.includes("dashboard.html")) {
    const cedula = localStorage.getItem("cedula_actual");
    const data = JSON.parse(localStorage.getItem("ajecoins_data")) || [];

    const user = data.find(u => u.cedula === cedula);

    if (!user) {
        alert("Usuario no encontrado");
        window.location.href = "usuario.html";
    } else {
        document.getElementById("nombre").innerText = user.nombre;
        document.getElementById("cedula").innerText = user.cedula;
        document.getElementById("cedis").innerText = user.cedis;
        document.getElementById("coins").innerText = user.coins;
    }
}
