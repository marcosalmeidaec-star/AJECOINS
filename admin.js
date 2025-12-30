function procesarCSV() {
    const file = document.getElementById("fileInput").files[0];
    if (!file) return alert("Selecciona un archivo CSV");

    const reader = new FileReader();
    reader.onload = function (e) {
        const lines = e.target.result.split("\n");
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === "") continue;

            const [fecha, cedula, nombre, cedis, coins] = lines[i].split(",");

            data.push({
                fecha,
                cedula,
                nombre,
                cedis,
                coins: Number(coins)
            });
        }

        localStorage.setItem("ajecoins_data", JSON.stringify(data));
        document.getElementById("mensaje").innerText = "✅ Datos cargados correctamente";
    };
    reader.readAsText(file);
}
