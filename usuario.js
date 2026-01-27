// 🔹 FIREBASE COMPAT (Mantener igual)
const firebaseConfig = {
  apiKey: "AIzaSyCsz2EP8IsTlG02uU2_GRfyQeeajMDuJjI",
  authDomain: "ajecoins-73829.firebaseapp.com",
  projectId: "ajecoins-73829",
  storageBucket: "ajecoins-73829.appspot.com",
  messagingSenderId: "247461322350",
  appId: "1:247461322350:web:802185ad39249ca650507f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ================= ELEMENTOS ================= */
const loginCard = document.getElementById('login');
const cuentaCard = document.getElementById('cuenta');
const cedulaInput = document.getElementById('cedulaInput'); // Mantenemos el ID del HTML para no romperlo
const passwordInput = document.getElementById('passwordInput');
const ingresarBtn = document.getElementById('ingresarBtn');
const cerrarBtn = document.getElementById('cerrarBtn');
const btnCambiarPass = document.getElementById('btnCambiarPass');
const datosUl = document.getElementById('datos');
const coinsP = document.getElementById('coins');
const errorMsg = document.getElementById('errorMsg');
const tiendaDiv = document.getElementById('productosTienda');
const carritoList = document.getElementById('carritoList');
const bolsaSpan = document.getElementById('bolsa');
const historialList = document.getElementById('historialList');
const loader = document.getElementById('loader');

/* ================= VARIABLES ================= */
let coinsUsuario = 0;
let carrito = [];
let userCod = ''; // Cambiado de userCed
let userNombre = '';
let userCedis = '';

/* ================= EVENTOS ================= */
ingresarBtn.addEventListener('click', buscarUsuario);
cerrarBtn.addEventListener('click', () => location.reload());
document.getElementById('btnConfirmar').addEventListener('click', confirmarCompra);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
btnCambiarPass.addEventListener("click", cambiarPassword);

/* ================= LOADER ================= */
function mostrarLoader(mensaje='Procesando…'){
  loader.querySelector('p').textContent = mensaje;
  loader.classList.add('active');
}
function ocultarLoader(){
  loader.classList.remove('active');
}

/* ================= CREDENCIALES ================= */

// Esta función ahora crea la credencial usando el Código de Vendedor
async function crearCredencialSiNoExiste(cod){
  const ref = db.collection("credenciales").doc(cod);
  const doc = await ref.get();
  if(!doc.exists){
    await ref.set({
      password: cod, // Contraseña inicial es su código
      creado: firebase.firestore.FieldValue.serverTimestamp(),
      email: "" // Campo preparado para tu siguiente petición
    });
  }
}

async function obtenerCredencial(cod){
  const doc = await db.collection("credenciales").doc(cod).get();
  return doc.exists ? doc.data() : null;
}

/* ================= LOGIN ================= */
async function buscarUsuario(){
  const cod = cedulaInput.value.trim(); // Tomamos el valor del input (aunque se llame cedulaInput)
  const pass = passwordInput.value.trim();

  if(!cod || !pass){
    errorMsg.textContent='Código y contraseña obligatorias';
    return;
  }

  mostrarLoader('Verificando credenciales…');

  try{
    // BUSQUEDA POR codVendedor
    const snap = await db.collection('usuariosPorFecha').where('codVendedor','==',cod).get();
    
    if(snap.empty){
      errorMsg.textContent='Código de vendedor no encontrado';
      ocultarLoader();
      return;
    }

    await crearCredencialSiNoExiste(cod);
    const cred = await obtenerCredencial(cod);

    if(cred.password !== pass){
      errorMsg.textContent='Contraseña incorrecta';
      ocultarLoader();
      return;
    }

    let totalCoins=0, fechaMasReciente='', nombre='', cedis='';

    snap.forEach(doc=>{
      const d=doc.data();
      totalCoins += Number(d.coins_ganados);
      if(!fechaMasReciente || new Date(d.fecha)>new Date(fechaMasReciente)){
        fechaMasReciente=d.fecha;
        nombre=d.nombre;
        cedis=d.cedis;
      }
    });

    // Cambiamos la búsqueda de compras también a codVendedor
    const snapCompras = await db.collection('compras').where('codVendedor','==',cod).get();
    let totalGastado=0;
    snapCompras.forEach(d=> totalGastado += Number(d.data().total));

    coinsUsuario = totalCoins - totalGastado;
    userCod = cod;
    userNombre = nombre;
    userCedis = cedis;

    mostrarDatos({fecha:fechaMasReciente, codigo:cod, nombre, cedis});
    coinsP.textContent = coinsUsuario;

    await cargarProductos();
    await cargarHistorial();

  }catch(err){
    console.error(err);
    errorMsg.textContent='Error al cargar datos';
  }finally{
    ocultarLoader();
  }
}

/* ================= CAMBIAR PASSWORD ================= */
async function cambiarPassword(){
  const nueva = prompt("Ingrese nueva contraseña:");
  if(!nueva || nueva.length < 4){
    alert("Mínimo 4 caracteres");
    return;
  }

  await db.collection("credenciales").doc(userCod).update({
    password: nueva
  });

  alert("Contraseña actualizada");
}

/* ================= UI ================= */
function mostrarDatos(u){
  loginCard.classList.add('hidden');
  cuentaCard.classList.remove('hidden');
  datosUl.innerHTML=`
    <li><strong>Fecha:</strong> ${u.fecha}</li>
    <li><strong>Código:</strong> ${u.codigo}</li>
    <li><strong>Nombre:</strong> ${u.nombre}</li>
    <li><strong>Cedis:</strong> ${u.cedis}</li>
  `;
}

/* ================= PRODUCTOS ================= */
async function cargarProductos(){
  tiendaDiv.innerHTML='';
  const snap = await db.collection('productos').get();

  snap.forEach(doc=>{
    const p=doc.data();
    const div=document.createElement('div');
    div.className='tarjeta';
    div.innerHTML=`
      <img src="assets/productos/${p.producto}.png">
      <h4>${p.producto}</h4>
      <b>${p.coins} coins</b>
      <button>Agregar</button>
    `;
    div.querySelector('button').onclick = ()=> agregarAlCarrito(p.producto, p.coins);
    tiendaDiv.appendChild(div);
  });
}

/* ================= CARRITO ================= */
function agregarAlCarrito(nombre, precio){
  if(coinsUsuario < precio){
    alert('No tienes coins suficientes');
    return;
  }
  carrito.push({nombre, precio});
  renderCarrito();
}

function renderCarrito(){
  carritoList.innerHTML='';
  let total=0;

  carrito.forEach(i=>{
    total+=i.precio;
    carritoList.innerHTML += `<li>${i.nombre} <span>${i.precio} c</span></li>`;
  });

  bolsaSpan.textContent=`${total} c`;

  let btnFin = document.getElementById('btnFin');
  if(carrito.length && !btnFin){
    btnFin = document.createElement('button');
    btnFin.id='btnFin';
    btnFin.textContent='Finalizar compra';
    btnFin.onclick = abrirModal;
    carritoList.after(btnFin);
  }else if(!carrito.length && btnFin){
    btnFin.remove();
  }
}

/* ================= MODAL ================= */
function abrirModal(){
  const total = carrito.reduce((a,b)=>a+b.precio,0);
  document.getElementById('totalFin').textContent=`Total: ${total} coins`;
  document.getElementById('resumenList').innerHTML =
    carrito.map(i=>`<li>${i.nombre} · ${i.precio}</li>`).join('');
  document.getElementById('modalFin').classList.remove('hidden');
}

function cerrarModal(){
  document.getElementById('modalFin').classList.add('hidden');
}

/* ================= COMPRA ================= */
async function confirmarCompra(){
  const total = carrito.reduce((a,b)=>a+b.precio,0);
  if(total > coinsUsuario){
    alert('Fondos insuficientes');
    return;
  }

  cerrarModal();
  mostrarLoader('Procesando compra…');

  try{
    await db.collection('compras').add({
      codVendedor: userCod, // Guardamos con código de vendedor
      nombre: userNombre,
      cedis: userCedis,
      items: carrito,
      total: total,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    });

    coinsUsuario -= total;
    coinsP.textContent = coinsUsuario;
    carrito = [];
    renderCarrito();
    await cargarHistorial();

  }catch(err){
    console.error(err);
    alert('Error al procesar la compra');
  }finally{
    ocultarLoader();
  }
}

/* ================= HISTORIAL ================= */
async function cargarHistorial(){
  historialList.innerHTML='';
  const snap = await db.collection('compras').where('codVendedor','==',userCod).get();

  if(snap.empty){
    historialList.innerHTML='<li>Sin compras</li>';
    return;
  }

  snap.forEach(doc=>{
    const c=doc.data();
    historialList.innerHTML += `<li>${c.items.map(i=>i.nombre).join(", ")} — ${c.total} coins</li>`;
  });
}
