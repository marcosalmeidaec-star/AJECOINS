/* ================= CONFIGURACIÓN ================= */
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

/* ================= ELEMENTOS UI ================= */
const loginCard = document.getElementById('login');
const cuentaCard = document.getElementById('cuenta');
const cedulaInput = document.getElementById('cedulaInput'); 
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
const movimientosBody = document.getElementById('movimientosBody'); // Referencia a la nueva tabla
const loader = document.getElementById('loader');
const modalCorreo = document.getElementById('modalCorreo');
const modalRecuperar = document.getElementById('modalRecuperar');

/* ================= VARIABLES GLOBALES ================= */
let coinsUsuario = 0;
let carrito = [];
let userCod = ''; 
let userNombre = '';
let userCedis = '';
let codigoGenerado = "";

/* ================= EVENTOS ================= */
ingresarBtn.addEventListener('click', buscarUsuario);
cerrarBtn.addEventListener('click', () => location.reload());
document.getElementById('btnConfirmar').addEventListener('click', confirmarCompra);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
btnCambiarPass.addEventListener("click", cambiarPassword);

document.getElementById('btnGuardarEmail').addEventListener('click', guardarEmail);
document.getElementById('olvideLink').addEventListener('click', (e) => {
    e.preventDefault();
    modalRecuperar.classList.remove('hidden');
});
document.getElementById('btnEnviarCodigo').addEventListener('click', flujoEnviarCodigo);
document.getElementById('btnRestablecer').addEventListener('click', restablecerPassword);
document.getElementById('btnCerrarRecuperar').addEventListener('click', () => modalRecuperar.classList.add('hidden'));

/* ================= LOADER ================= */
function mostrarLoader(mensaje='Procesando…'){
  loader.querySelector('p').textContent = mensaje;
  loader.classList.add('active');
}
function ocultarLoader(){
  loader.classList.remove('active');
}

/* ================= CREDENCIALES ================= */
async function crearCredencialSiNoExiste(cod){
  const ref = db.collection("credenciales").doc(cod);
  const doc = await ref.get();
  if(!doc.exists){
    await ref.set({
      password: cod, 
      creado: firebase.firestore.FieldValue.serverTimestamp(),
      email: "",
      requiereCambio: true 
    });
  }
}

async function obtenerCredencial(cod){
  const doc = await db.collection("credenciales").doc(cod).get();
  return doc.exists ? doc.data() : null;
}

/* ================= LOGIN Y SEGURIDAD ================= */
async function buscarUsuario(){
  const cod = cedulaInput.value.trim();
  const pass = passwordInput.value.trim();

  if(!cod || !pass){
    errorMsg.textContent='Código y contraseña obligatorios';
    return;
  }

  mostrarLoader('Verificando credenciales…');

  try{
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

    userCod = cod;

    if (cred.requiereCambio === true) {
        ocultarLoader();
        const nueva = prompt("🔒 SEGURIDAD: Debes cambiar tu contraseña inicial por una personal:");
        if(!nueva || nueva.length < 4) {
            alert("Acceso denegado. Debes definir una contraseña de al menos 4 caracteres.");
            return;
        }
        mostrarLoader('Actualizando...');
        await db.collection("credenciales").doc(userCod).update({ 
            password: nueva,
            requiereCambio: false 
        });
        alert("Contraseña actualizada. Por favor, ingresa de nuevo.");
        location.reload(); 
        return;
    }

    if (!cred.email) {
        ocultarLoader();
        modalCorreo.classList.remove('hidden');
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

    const snapCompras = await db.collection('compras').where('codVendedor','==',cod).get();
    let totalGastado=0;
    snapCompras.forEach(d=> totalGastado += Number(d.data().total));

    coinsUsuario = totalCoins - totalGastado;
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

/* ================= RECUPERACIÓN ================= */
async function guardarEmail() {
    const email = document.getElementById('emailRegistroInput').value.trim();
    if (!email.includes("@")) return alert("Ingresa un correo válido");
    mostrarLoader('Guardando...');
    await db.collection("credenciales").doc(userCod).update({ email: email });
    location.reload();
}

async function flujoEnviarCodigo() {
    const cod = document.getElementById('codRecuperar').value.trim();
    const email = document.getElementById('emailRecuperar').value.trim();
    mostrarLoader('Enviando código...');
    const cred = await obtenerCredencial(cod);
    if (!cred || cred.email !== email) { ocultarLoader(); return alert("Los datos no coinciden."); }
    codigoGenerado = Math.floor(100000 + Math.random() * 900000).toString();
    const templateParams = { user_name: cod, user_email: email, recovery_code: codigoGenerado };
    try {
        await emailjs.send('service_5zouh3m', 'template_fwvkczd', templateParams);
        alert("Código enviado con éxito.");
        document.getElementById('step1Recuperar').classList.add('hidden');
        document.getElementById('step2Recuperar').classList.remove('hidden');
    } catch (e) { alert("Error al enviar email."); } finally { ocultarLoader(); }
}

async function restablecerPassword() {
    const codIn = document.getElementById('codigoVerificacionInput').value.trim();
    const pass = document.getElementById('nuevaPassInput').value.trim();
    const user = document.getElementById('codRecuperar').value.trim();
    if (codIn !== codigoGenerado) return alert("Código incorrecto");
    await db.collection("credenciales").doc(user).update({ password: pass, requiereCambio: false });
    alert("Contraseña restablecida correctamente.");
    location.reload();
}

/* ================= MOVIMIENTOS DETALLADOS (ESTILO ADMIN) ================= */
async function cargarHistorial() {
  movimientosBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Cargando movimientos...</td></tr>';
  
  try {
    let movimientos = [];
    let saldoCalc = 0;

    // 1. Obtener CARGAS
    const snapIngresos = await db.collection('usuariosPorFecha').where('codVendedor', '==', userCod).get();
    snapIngresos.forEach(doc => {
      const d = doc.data();
      movimientos.push({
        fecha: d.fecha,
        concepto: "Carga de Coins",
        coins: Number(d.coins_ganados)
      });
    });

    // 2. Obtener COMPRAS
    const snapCompras = await db.collection('compras').where('codVendedor', '==', userCod).get();
    snapCompras.forEach(doc => {
      const c = doc.data();
      const fechaC = c.fecha.toDate().toISOString().slice(0, 10);
      movimientos.push({
        fecha: fechaC,
        concepto: `Canje: ${c.items.map(i => i.nombre).join(", ")}`,
        coins: -Number(c.total)
      });
    });

    // 3. Ordenar por fecha (Antiguo a Reciente)
    movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // 4. Renderizar
    movimientosBody.innerHTML = '';
    if (movimientos.length === 0) {
      movimientosBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Sin movimientos</td></tr>';
      return;
    }

    movimientos.forEach(m => {
      saldoCalc += m.coins;
      const colorC = m.coins >= 0 ? '#007a5a' : '#d9534f';
      const prefijo = m.coins >= 0 ? '+' : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.fecha}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.concepto}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align:center; color:${colorC}; font-weight:bold;">${prefijo}${m.coins}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align:center; font-weight:bold;">${saldoCalc}</td>
      `;
      movimientosBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    movimientosBody.innerHTML = '<tr><td colspan="4">Error al cargar historial</td></tr>';
  }
}

/* ================= FUNCIONES UI Y TIENDA ================= */
function mostrarDatos(u){
  loginCard.classList.add('hidden');
  cuentaCard.classList.remove('hidden');
  datosUl.innerHTML=`<li><strong>Fecha:</strong> ${u.fecha}</li><li><strong>Código:</strong> ${u.codigo}</li><li><strong>Nombre:</strong> ${u.nombre}</li><li><strong>Cedis:</strong> ${u.cedis}</li>`;
}

async function cargarProductos(){
  tiendaDiv.innerHTML='';
  const snap = await db.collection('productos').get();
  snap.forEach(doc=>{
    const p=doc.data();
    const div=document.createElement('div');
    div.className='tarjeta';
    div.innerHTML=`<img src="assets/productos/${p.producto}.png"><h4>${p.producto}</h4><b>${p.coins} c</b><button>Agregar</button>`;
    div.querySelector('button').onclick = ()=> agregarAlCarrito(p.producto, p.coins);
    tiendaDiv.appendChild(div);
  });
}

function agregarAlCarrito(nombre, precio){
  if(coinsUsuario < precio){ alert('Coins insuficientes'); return; }
  carrito.push({nombre, precio});
  renderCarrito();
}

function renderCarrito(){
  carritoList.innerHTML='';
  let total=0;
  carrito.forEach(i=>{ total+=i.precio; carritoList.innerHTML += `<li>${i.nombre} <span>${i.precio} c</span></li>`; });
  bolsaSpan.textContent=`${total} c`;
  let btnFin = document.getElementById('btnFin');
  if(carrito.length && !btnFin){
    btnFin = document.createElement('button');
    btnFin.id='btnFin'; btnFin.textContent='Finalizar compra';
    btnFin.onclick = abrirModal;
    carritoList.after(btnFin);
  }else if(!carrito.length && btnFin){ btnFin.remove(); }
}

function abrirModal(){
  const total = carrito.reduce((a,b)=>a+b.precio,0);
  document.getElementById('totalFin').textContent=`Total: ${total} c`;
  document.getElementById('resumenList').innerHTML = carrito.map(i=>`<li>${i.nombre} · ${i.precio}</li>`).join('');
  document.getElementById('modalFin').classList.remove('hidden');
}

function cerrarModal(){ document.getElementById('modalFin').classList.add('hidden'); }

async function confirmarCompra(){
  const total = carrito.reduce((a,b)=>a+b.precio,0);
  cerrarModal();
  mostrarLoader('Procesando...');
  try{
    await db.collection('compras').add({ codVendedor: userCod, nombre: userNombre, cedis: userCedis, items: carrito, total: total, fecha: firebase.firestore.FieldValue.serverTimestamp() });
    coinsUsuario -= total;
    coinsP.textContent = coinsUsuario;
    carrito = [];
    renderCarrito();
    await cargarHistorial(); // Actualiza la tabla de movimientos tras la compra
  }catch(err){ alert('Error'); }finally{ ocultarLoader(); }
}

async function cambiarPassword(){
  const nueva = prompt("Nueva contraseña:");
  if(!nueva || nueva.length < 4) return;
  await db.collection("credenciales").doc(userCod).update({ password: nueva });
  alert("Cambiado.");
}
