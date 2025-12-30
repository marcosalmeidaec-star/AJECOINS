document.getElementById("btnConsultar").addEventListener("click", function () {
    const cedulaIngresada = document.getElementById("cedulaInput").value.trim();
    const resultado = document.getElementById("resultado");

    if (cedulaIngresada === "") {
        resultado.innerHTML = "⚠️ Ingresa una cédula";
        return;
    }

    const dataGuardada = localStorage.getItem("aje_coins_data");

    if (!dataGuardada) {
        resultado.innerHTML = "❌ No hay datos cargados por el administrador";
        return;
    }

    const registros = JSON.parse(dataGuardada);

    // Filtrar registros por cédula
    const registrosUsuario = registros.filter(
        r => r.cedula === cedulaIngresada
    );

    if (registrosUsuario.length === 0) {
        resultado.innerHTML = "❌ No se encontraron registros para esta cédula";
        return;
    }

    // Sumar coins
    let totalCoins = 0;
    registrosUsuario.forEach(r => {
        totalCoins += Number(r.coins);
    });

    const user = registrosUsuario[0];

    resultado.innerHTML = `
        <h3>👤 ${user.nombre}</h3>
        <p><strong>Cédula:</strong> ${user.cedula}</p>
        <p><strong>CEDIS:</strong> ${user.cedis}</p>
        <p><strong>Total Coins:</strong> ${totalCoins}</p>
    `;
});
