// 🔹 FIREBASE COMPAT
const firebaseConfig = {
  apiKey: "AIzaSyCsz2EP8IsTlG02uU2_GRfyQeeajMDuJjI",
  authDomain: "ajecoins-73829.firebaseapp.com",
  projectId: "ajecoins-73829",
  storageBucket: "ajecoins-73829",
  messagingSenderId: "247461322350",
  appId: "1:247461322350:web:802185ad39249ca650507f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ================= ELEMENTOS ================= */
const loginCard = document.getElementById('login');
const cuentaCard = document.getElementById('cuenta');
const cedulaInput = document.getElementById('cedulaInput');
const ingresarBtn = document.getElementById('ingresarBtn');
const cerrarBtn = document.getElementById('cerrarBtn');
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
let userCed = '';

/* ================= EVENTOS ================= */
ingresarBtn.onclick = buscarUsuario;
cerrarBtn.onclick = () => location.reload();
document.getElementById('btnConfirmar').onclick = confirmarCompra;
document.getElementById('btnCancelar').onclick = cerrarModal;

/* ================= LOADER ================= */
function mostrarLoader(msg='Procesando…'){
  loader.querySelector('p').textContent = msg;
  loader.classList.add('active');
}
function ocultarLoader(){
  loader.classList.remove('active');
}

/* ================= LOGIN ================= */
async function buscarUsuario(){
  const ced = cedulaInput.value.trim();
  if(!ced){ errorMsg.textContent='Escribe tu cédula'; return; }

  mostrarLoader('Cargando datos…');

  try{
    const snap = await db.collection('usuariosPorFecha')
      .where('cedula','==',ced).get();

    if(snap.empty){
      errorMsg.textContent='Cédula no encontrada';
      ocultarLoader();
      return;
    }

    let totalCoins=0, fecha='', nombre='', cedis='';

    snap.forEach(doc=>{
      const d=doc.data();
      totalCoins += Number(d.coins_ganados||0);
      if(!fecha || new Date(d.fecha) > new Date(fecha)){
        fecha=d.fecha;
        nombre=d.nombre;
        cedis=d.cedis;
      }
    });

    const compras = await db.collection('compras')
      .where('cedula','==',ced).get();

    let gastado=0;
    compras.forEach(d=> gastado+=Number(d.data().total||0));

    coinsUsuario = totalCoins - gastado;
    userCed = ced;

    mostrarDatos({fecha,cedula:ced,nombre,cedis});
    coinsP.textContent = coinsUsuario;

    cargarProductos();
    cargarHistorial();

  }catch(e){
    console.error(e);
    errorMsg.textContent='Error al cargar datos';
  }finally{
    ocultarLoader();
  }
}

/* ================= UI ================= */
function mostrarDatos(u){
  loginCard.classList.add('hidden');
  cuentaCard.classList.remove('hidden');
  datosUl.innerHTML = `
    <li><b>Fecha:</b> ${u.fecha}</li>
    <li><b>Cédula:</b> ${u.cedula}</li>
    <li><b>Nombre:</b> ${u.nombre}</li>
    <li><b>Cedis:</b> ${u.cedis}</li>
  `;
}

/* ================= PRODUCTOS ================= */
async function cargarProductos(){
  tiendaDiv.innerHTML='';
  const snap = await db.collection('productos').get();

  snap.forEach(doc=>{
    const p = doc.data();
    const div = document.createElement('div');
    div.className='tarjeta';
    div.innerHTML = `
      <img src="assets/productos/${p.producto}.png">
      <h4>${p.producto}</h4>
      <b>${p.coins} coins</b>
      <button>Agregar</button>
    `;
    div.querySelector('button').onclick=()=>agregarAlCarrito(p.producto,p.coins);
    tiendaDiv.appendChild(div);
  });
}

/* ================= CARRITO ================= */
function agregarAlCarrito(nombre,precio){
  if(coinsUsuario < precio) return alert('No tienes coins suficientes');
  carrito.push({nombre,precio});
  renderCarrito();
}

function renderCarrito(){
  carritoList.innerHTML='';
  let total=0;

  carrito.forEach(i=>{
    total+=i.precio;
    const li=document.createElement('li');
    li.innerHTML=`${i.nombre} <span>${i.precio} c</span>`;
    carritoList.appendChild(li);
  });

  bolsaSpan.textContent = `${total} c`;

  if(carrito.length){
    const li=document.createElement('li');
    li.style.textAlign='center';

    const btn=document.createElement('button');
    btn.textContent='Finalizar compra';
    btn.onclick = abrirModal;

    li.appendChild(btn);
    carritoList.appendChild(li);
  }
}

/* ================= MODAL ================= */
function abrirModal(){
  const total = carrito.reduce((a,b)=>a+b.precio,0);
  document.getElementById('totalFin').textContent=`Total: ${total} coins`;
  document.getElementById('resumenList').innerHTML=
    carrito.map(i=>`<li>${i.nombre} · ${i.precio}</li>`).join('');
  document.getElementById('modalFin').classList.remove('hidden');
}
function cerrarModal(){
  document.getElementById('modalFin').classList.add('hidden');
}

/* ================= COMPRA ================= */
async function confirmarCompra(){
  const total = carrito.reduce((a,b)=>a+b.precio,0);
  if(total>coinsUsuario) return alert('Fondos insuficientes');

  mostrarLoader('Procesando compra…');

  try{
    await db.collection('compras').add({
      cedula:userCed,
      items:carrito,
      total,
      fecha:firebase.firestore.FieldValue.serverTimestamp()
    });

    coinsUsuario-=total;
    coinsP.textContent=coinsUsuario;
    carrito=[];
    renderCarrito();
    cargarHistorial();

  }catch(e){
    alert('Error en compra');
    console.error(e);
  }finally{
    cerrarModal();
    ocultarLoader();
  }
}

/* ================= HISTORIAL ================= */
async function cargarHistorial(){
  historialList.innerHTML='';
  const snap=await db.collection('compras')
    .where('cedula','==',userCed).get();

  if(snap.empty){
    historialList.innerHTML='<li>Sin compras</li>';
    return;
  }

  snap.forEach(doc=>{
    const c=doc.data();
    historialList.innerHTML+=`<li>${c.total} coins</li>`;
  });
}
