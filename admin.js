function procesarCSV() {
    const input = document.getElementById("fileInput");
    const mensaje = document.getElementById("mensaje");

    if (!input.files.length) {
        alert("Selecciona un archivo CSV");
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const texto = e.target.result;
        const lineas = texto.split(/\r?\n/);

        const datos = [];

        for (let i = 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (linea === "") continue;

            const columnas = linea.split(",");

            datos.push({
                fecha: columnas[0],
                cedula: columnas[1],
                nombre: columnas[2],
                cedis: columnas[3],
                coins: Number(columnas[4])
            });
        }

        localStorage.setItem("ajecoins_data", JSON.stringify(datos));
        mensaje.innerText = "✅ Archivo cargado correctamente";
    };

    reader.readAsText(file);
}
