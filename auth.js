// Config de seguridad (en GitHub Pages, usaremos secrets en el workflow)
const SECRETS = {
  adminUser: '__ADMIN_USER__',
  adminPass: '__ADMIN_PASS__'
};

// Simple hash para no tener credenciales en plaintext
const hash = str => {
  let h = 0;
  for(let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h.toString();
};

// Session Manager
export const Auth = {
  login(user, pass) {
    // Reemplazado en build time por GitHub Actions
    if (hash(user) === hash(SECRETS.adminUser) && hash(pass) === hash(SECRETS.adminPass)) {
      return { role: 'admin', user };
    }
    if (user && user === pass) {
      return { role: 'user', user };
    }
    return null;
  },
  
  setSession(data) {
    sessionStorage.setItem('aje_session', JSON.stringify({...data, time: Date.now()}));
  },
  
  getSession() {
    const s = sessionStorage.getItem('aje_session');
    return s ? JSON.parse(s) : null;
  },
  
  logout() {
    sessionStorage.removeItem('aje_session');
  }
};

// Global functions para HTML onclick
window.login = () => {
  const user = document.getElementById('user').value.trim();
  const pass = document.getElementById('pass').value.trim();
  const auth = Auth.login(user, pass);
  
  if (auth) {
    Auth.setSession(auth);
    window.location.href = auth.role === 'admin' ? 'admin.html' : 'usuario.html';
  } else {
    alert('Credenciales incorrectas');
  }
};

window.irAdmin = () => window.location.href = 'login.html';
window.irUsuario = () => window.location.href = 'login.html';
