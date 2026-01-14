import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc,
  query, where, addDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* =================== FIREBASE =================== */

const firebaseConfig = {
  apiKey: "AIzaSyCsz2EP8IsTlG02uU2_GRfyQeeajMDuJjI",
  authDomain: "ajecoins-73829.firebaseapp.com",
  projectId: "ajecoins-73829",
  storageBucket: "ajecoins-73829.firebasestorage.app",
  messagingSenderId: "247461322350",
  appId: "1:247461322350:web:802185ad39249ca650507f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =================== UTIL =================== */

function normalizarFecha(fecha){
  const [d,m,y] = fecha.split("/");
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

function descargarCSV(nombre, filas){
  let csv = filas.map(f=>f.join(";")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
}

/* =================== CARGA USUARIOS CSV =================== */

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

uploadBtn.addEventListener("click", async()=>{
  const file = fileInput.files[0];
  if(!file) return alert("Selecciona CSV");

  const text = await file.text();
  const lines = text.trim().split("\n").slice(1);

  let subidos = 0;

  for(const line of lines){
    const [fechaRaw, cedula, nombre, cedis, coins] = line.split(";").map(x=>x.trim());
    if(!fechaRaw || !cedula) continue;

    const fecha = normalizarFecha(fechaRaw);
    const id = `${fecha}_${cedula}`;

    const ref = doc(db,"usuariosPorFecha",id);
    const snap = await getDocs(query(collection(db,"usuariosPorFecha"), where("__name__","==",id)));

    if(snap.empty){
      await setDoc(ref,{
        fecha,
        cedula,
        nombre,
        cedis,
        coins_ganados: parseInt(coins,10),
        creado: Timestamp.now()
      });
      subidos++;
    }
  }

  alert(`Movimientos nuevos registrados: ${subidos}`);
  loadUsers();
});

/* =================== USUARIOS =================== */

const usersBody = document.querySelector("#usersTable tbody");
const filtroFecha = document.getElementById("filtroFecha");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnVerTodo = document.getElementById("btnVerTodo");
const btnExportUsers = document.getElementById("btnExportUsers");

let cacheUsuarios = [];

async function loadUsers(){
  usersBody.innerHTML="";
  cacheUsuarios = [];
  const snap = await getDocs(collection(db,"usuariosPorFecha"));
  snap.forEach(d=>{
    const u=d.data();
    cacheUsuarios.push(u);
  });
  renderUsers(cacheUsuarios);
}

function renderUsers(lista){
  usersBody.innerHTML="";
  lista.forEach(u=>{
    usersBody.innerHTML+=`
      <tr>
        <td>${u.fecha}</td>
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td>${u.cedis}</td>
        <td>${u.coins_ganados}</td>
      </tr>`;
  });
}

btnFiltrar.onclick = ()=>{
  const f = filtroFecha.value;
  renderUsers(cacheUsuarios.filter(u=>u.fecha===f));
};
btnVerTodo.onclick = ()=> renderUsers(cacheUsuarios);

btnExportUsers.onclick = ()=>{
  const filas = [["Fecha","Cedula","Nombre","Cedis","Coins"]];
  cacheUsuarios.forEach(u=>{
    filas.push([u.fecha,u.cedula,u.nombre,u.cedis,u.coins_ganados]);
  });
  descargarCSV("usuarios.csv",filas);
};

/* =================== PRODUCTOS =================== */

const productFileInput = document.getElementById("productFileInput");
const uploadProductBtn = document.getElementById("uploadProductBtn");
const productsBody = document.querySelector("#productsTable tbody");

uploadProductBtn.onclick = async ()=>{
  const file = productFileInput.files[0];
  if(!file) return alert("Selecciona CSV productos");

  const text = await file.text();
  const lines = text.trim().split("\n").slice(1);

  for(const line of lines){
    const [nombre, coins] = line.replace(/"/g,"").split(";");
    await setDoc(doc(db,"productos",nombre.trim()),{
      producto:nombre.trim(),
      coins:parseInt(coins.trim(),10)
    });
  }
  loadProducts();
};

async function loadProducts(){
  productsBody.innerHTML="";
  const snap = await getDocs(collection(db,"productos"));
  snap.forEach(d=>{
    const p=d.data();
    productsBody.innerHTML+=`
      <tr>
        <td>${p.producto}</td>
        <td><img src="assets/productos/${p.producto}.png" width="70"></td>
        <td>${p.coins}</td>
      </tr>`;
  });
}

/* =================== COMPRAS =================== */

const comprasBody = document.querySelector("#comprasTable tbody");
const btnExport = document.getElementById("btnExport");
let cacheCompras=[];

async function loadCompras(){
  comprasBody.innerHTML="";
  cacheCompras=[];
  const snap = await getDocs(collection(db,"compras"));
  snap.forEach(d=>{
    const c=d.data();
    cacheCompras.push(c);
  });
  renderCompras(cacheCompras);
}

function renderCompras(lista){
  comprasBody.innerHTML="";
  lista.forEach(c=>{
    comprasBody.innerHTML+=`
      <tr>
        <td>${c.fecha.toDate().toLocaleString()}</td>
        <td>${c.cedula}</td>
        <td>${c.nombre}</td>
        <td>${c.cedis}</td>
        <td>${c.items.map(i=>i.nombre).join(", ")}</td>
        <td>${c.total}</td>
      </tr>`;
  });
}

btnExport.onclick = ()=>{
  const filas=[["Fecha","Cedula","Nombre","Cedis","Productos","Total"]];
  cacheCompras.forEach(c=>{
    filas.push([
      c.fecha.toDate().toLocaleString(),
      c.cedula,
      c.nombre,
      c.cedis,
      c.items.map(i=>i.nombre).join(", "),
      c.total
    ]);
  });
  descargarCSV("compras.csv",filas);
};

/* =================== MOVIMIENTOS =================== */

const movCedula = document.getElementById("movCedula");
const btnVerMov = document.getElementById("btnVerMov");
const btnExportMov = document.getElementById("btnExportMov");
const btnExportAllMov = document.getElementById("btnExportAllMov");
const movBody = document.querySelector("#movTable tbody");

btnVerMov.onclick = async ()=>{
  const ced = movCedula.value.trim();
  if(!ced) return alert("Ingresa una cédula");

  movBody.innerHTML="<tr><td colspan='5'>Cargando…</td></tr>";
  const movimientos = await obtenerMovimientos(ced);
  renderMov(movimientos);
};

async function obtenerMovimientos(ced){
  let movimientos=[];
  let saldo=0;

  const ingresos = await getDocs(query(collection(db,"usuariosPorFecha"), where("cedula","==",ced)));
  ingresos.forEach(d=>{
    const u=d.data();
    movimientos.push({cedula:u.cedula,fecha:u.fecha,concepto:"Carga",coins:u.coins_ganados});
  });

  const compras = await getDocs(query(collection(db,"compras"), where("cedula","==",ced)));
  compras.forEach(d=>{
    const c=d.data();
    movimientos.push({cedula:c.cedula,fecha:c.fecha.toDate().toISOString().slice(0,10),concepto:c.items.map(i=>i.nombre).join(","),coins:-c.total});
  });

  movimientos.sort((a,b)=> new Date(a.fecha)-new Date(b.fecha));

  movimientos.forEach(m=>{saldo+=m.coins; m.saldo=saldo;});
  return movimientos;
}

function renderMov(lista){
  movBody.innerHTML="";
  if(!lista.length){
    movBody.innerHTML="<tr><td colspan='5'>Sin movimientos</td></tr>";
    return;
  }
  lista.forEach(m=>{
    movBody.innerHTML+=`
      <tr>
        <td>${m.cedula}</td>
        <td>${m.fecha}</td>
        <td>${m.concepto}</td>
        <td style="color:${m.coins>=0?'green':'red'}">${m.coins}</td>
        <td>${m.saldo}</td>
      </tr>`;
  });
}

/* =================== INIT =================== */

loadUsers();
loadProducts();
loadCompras();
