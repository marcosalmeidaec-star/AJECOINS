// PROTECCIÓN DE RUTA
const session = JSON.parse(sessionStorage.getItem('aje_session') || '{}');
if (!session || session.role !== 'user') {
  alert('Debes iniciar sesión');
  window.location.href = 'login.html';
}

const CATALOGO = [
  {id: 1, nombre: 'Taza', precio: 500, img: 'catalogo/taza.png'},
  {id: 2, nombre: 'Gorra', precio: 700, img: 'catalogo/gorra.png'},
  {id: 3, nombre: 'Mochila', precio: 1200, img: 'catalogo/mochila.png'}
];

const loadData = () => {
  const allCoins = JSON.parse(localStorage.getItem('aje_baseCoins') || '{}');
  return allCoins[session.cedula];
};

const renderCatalogo = (disponibles) => {
  document.querySelector('.catalogo').innerHTML = CATALOGO.map(item => `
    <div class="item">
      <img src="${item.img}" alt="${item.nombre}">
      <h3>${item.nombre}</h3>
      <p>${item.precio} Coins</p>
      <button ${disponibles < item.precio ? 'disabled' : ''} 
              onclick="canjear(${item.precio}, '${item.nombre}')">
        ${disponibles < item.precio ? 'Insuficiente' : 'Canjear'}
      </button>
    </div>
  `).join('');
};

const updateDisplay = () => {
  const userData = loadData();
  if (!userData) {
    document.getElementById('coins').innerHTML = '<span class="error">Usuario no encontrado</span>';
    return;
  }
  document.getElementById('coins').textContent = `Tienes ${userData.coins_actuales} AJE COINS`;
  renderCatalogo(userData.coins_actuales);
};

window.canjear = (precio, nombre) => {
  const allCoins = JSON.parse(localStorage.getItem('aje_baseCoins') || '{}');
  const userData = allCoins[session.cedula];
  
  if (!userData || userData.coins_actuales < precio) return alert('❌ Coins insuficientes');
  
  userData.coins_usados += precio;
  userData.coins_actuales -= precio;
  allCoins[session.cedula] = userData;
  
  localStorage.setItem('aje_baseCoins', JSON.stringify(allCoins));
  alert(`✅ Canjeaste ${nombre} por ${precio} coins!`);
  updateDisplay();
};

updateDisplay();
