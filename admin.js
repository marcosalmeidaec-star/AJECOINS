// PROTECCIÓN DE RUTA
const session = JSON.parse(sessionStorage.getItem('aje_session') || '{}');
if (!session || session.role !== 'admin') {
  alert('Acceso denegado');
  window.location.href = 'index.html';
}

const procesarExcel = async () => {
  const file = document.getElementById('excelFile').files[0];
  if (!file) return alert('Selecciona un archivo Excel');

  try {
    const buffer = await file.arrayBuffer();
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js');
    const wb = XLSX.read(buffer, {type: 'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    
    if (!rows.length || !rows[0].cedula) throw new Error('El Excel necesita columna "cedula"');
    
    const baseCoins = {};
    rows.forEach(r => {
      baseCoins[r.cedula] = {
        fecha: r.fecha, vendedor: r.vendedor, cedis: r.cedis,
        coins_ganados: Number(r.coins_ganados) || 0,
        coins_usados: 0,
        coins_actuales: Number(r.coins_ganados) || 0
      };
    });
    
    localStorage.setItem('aje_baseCoins', JSON.stringify(baseCoins));
    renderTabla(rows);
    document.getElementById('resultado').innerHTML = '<span class="success">✅ Excel cargado</span>';
  } catch(e) {
    document.getElementById('resultado').innerHTML = `<span class="error">❌ Error: ${e.message}</span>`;
  }
};

const renderTabla = (rows) => {
  const headers = Object.keys(rows[0]);
  document.querySelector('#tablaExcel thead').innerHTML = 
    `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
  document.querySelector('#tablaExcel tbody').innerHTML = 
    rows.map(r => `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('');
};

document.getElementById('procesarBtn').addEventListener('click', procesarExcel);
