// AUTENTICAÇÃO DE USUÁRIO
import { Session } from '../services/storage.js';

// refs
const form = document.getElementById('loginForm');
const email = document.getElementById('email');
const pwd = document.getElementById('password');
const remember = document.getElementById('remember');
const submitBtn = document.getElementById('submitBtn');
const alertBox = document.getElementById('loginAlert');
const togglePwd = document.getElementById('togglePwd');
const eyeOpen = document.getElementById('eyeOpen');
const eyeClosed = document.getElementById('eyeClosed');
const forgot = document.getElementById('forgotBtn');
const registerBtn = document.getElementById('registerBtn');

// util: validação simples
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function validate() {
  const pwdLen = pwd.value.trim().length;
  const ok = isEmail(email.value.trim()) && pwdLen >= 6 && pwdLen <= 10;
  submitBtn.disabled = !ok;
  return ok;
}

// olho da senha
togglePwd.addEventListener('click', () => {
  const isPwd = pwd.type === 'password';
  pwd.type = isPwd ? 'text' : 'password';

  // Garante que só um dos ícones aparece de cada vez
  if (isPwd) {
    eyeOpen.classList.add('hidden');
    eyeClosed.classList.remove('hidden');
  } else {
    eyeClosed.classList.add('hidden');
    eyeOpen.classList.remove('hidden');
  }
});

// “Esqueci minha senha” (simulado)
function forgotModal() {
  return new Promise((resolve) => {
    const root = document.getElementById('modalRoot');
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 bg-black/40 grid place-items-center p-4';
    wrap.innerHTML = `
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div class="p-5 border-b">
          <h3 class="text-lg font-semibold text-brand-900">Recuperar senha</h3>
        </div>
        <form class="p-5 grid gap-3">
          <label class="grid gap-1">
            <span class="text-sm text-brand-800">Informe seu e-mail cadastrado</span>
            <input name="email" type="email" required class="border rounded-lg px-3 py-2" placeholder="voce@exemplo.com"/>
          </label>
        </form>
        <div class="p-5 border-t flex justify-end gap-2">
          <button id="mCancel" type="button" class="px-4 py-2 rounded-lg border hover:bg-brand-50">Cancelar</button>
          <button id="mOk" type="submit" class="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">Enviar link</button>
        </div>
      </div>`;
    root.appendChild(wrap);
    wrap.querySelector('#mCancel').onclick = () => { wrap.remove(); resolve(null); };
    wrap.querySelector('#mOk').onclick = (e) => {
      e.preventDefault();
      const val = wrap.querySelector('input[name="email"]').value.trim();
      wrap.remove();
      resolve(val);
    };
  });
}
forgot.addEventListener('click', async () => {
  const val = await forgotModal();
  if (!val) return;
  const inf = document.createElement('div');
  inf.className = 'alert alert-info mt-3';
  inf.textContent = `Se existir uma conta com ${val}, enviaremos um link de redefinição de senha (simulado).`;
  form.appendChild(inf);
});

// habilita/desabilita botão conforme digitação
email.addEventListener('input', validate);
pwd.addEventListener('input', validate);

// lembrar e-mail (opcional)
const remembered = localStorage.getItem('vollmed_remember_email');
if (remembered) {
  email.value = remembered;
  validate();
}

// submit
form.addEventListener('submit', (e) => {
  e.preventDefault();
  alertBox.classList.add('hidden');
  if (!validate()) return;

  // login com credenciais específicas
  const ok = Session.login(email.value.trim(), pwd.value.trim());
  if (!ok) {
    alertBox.classList.remove('hidden');
    return;
  }

  // lembrar email
  if (remember.checked) localStorage.setItem('vollmed_remember_email', email.value.trim());
  else localStorage.removeItem('vollmed_remember_email');

  // vai para Médicos
  window.location.href = 'pages/doctors.html';
});

// cadastro de novo usuário
registerBtn.addEventListener('click', async () => {
  const modal = await showRegisterModal();
  if (modal.success) {
    const info = document.createElement('div');
    info.className = 'alert alert-info mt-3';
    info.textContent = 'Usuário cadastrado com sucesso!';
    form.appendChild(info);
    setTimeout(() => info.remove(), 3000);
  }
});

// modal de cadastro
function showRegisterModal() {
  return new Promise((resolve) => {
    const root = document.getElementById('modalRoot');
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 bg-black/40 grid place-items-center p-4 z-50';
    wrap.innerHTML = `
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div class="p-5 border-b">
          <h3 class="text-lg font-semibold text-brand-900">Cadastrar Novo Usuário</h3>
          <p class="text-sm text-gray-600 mt-1">Apenas administradores podem cadastrar novos usuários</p>
        </div>
        
        <div class="p-5">
          <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-sm text-yellow-800">Para continuar, confirme suas credenciais de administrador:</p>
          </div>
          
          <form class="grid gap-4">
            <label class="grid gap-1">
              <span class="text-sm text-brand-800">E-mail do Administrador</span>
              <input id="adminEmail" type="email" required class="border rounded-lg px-3 py-2" placeholder="Digite o e-mail do administrador"/>
            </label>
            <label class="grid gap-1">
              <span class="text-sm text-brand-800">Senha do Administrador</span>
              <input id="adminPassword" type="password" required class="border rounded-lg px-3 py-2" placeholder="Digite a senha do administrador"/>
            </label>
            
            <hr class="my-2">
            
            <label class="grid gap-1">
              <span class="text-sm text-brand-800">E-mail do Novo Usuário</span>
              <input id="newEmail" type="email" required class="border rounded-lg px-3 py-2" placeholder="usuario@vollmed.com"/>
            </label>
            <label class="grid gap-1">
              <span class="text-sm text-brand-800">Senha do Novo Usuário</span>
              <input id="newPassword" type="password" required minlength="6" maxlength="10" class="border rounded-lg px-3 py-2" placeholder="Entre 6 e 10 caracteres"/>
            </label>
          </form>
        </div>
        
        <div class="p-5 border-t flex justify-end gap-2">
          <button id="regCancel" type="button" class="px-4 py-2 rounded-lg border hover:bg-brand-50">Cancelar</button>
          <button id="regConfirm" type="button" class="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">Cadastrar</button>
        </div>
      </div>`;
    
    root.appendChild(wrap);
    
    const adminEmail = wrap.querySelector('#adminEmail');
    const adminPassword = wrap.querySelector('#adminPassword');
    const newEmail = wrap.querySelector('#newEmail');
    const newPassword = wrap.querySelector('#newPassword');
    
    wrap.querySelector('#regCancel').onclick = () => {
      wrap.remove();
      resolve({ success: false });
    };
    
    wrap.querySelector('#regConfirm').onclick = () => {
      // validar credenciais do admin
      if (adminEmail.value.trim() !== 'adm@vollmed.com' || adminPassword.value !== '123456') {
        alert('Credenciais de administrador inválidas!');
        return;
      }
      
      // validar novo usuário
      const newPwdLen = newPassword.value.length;
      if (!newEmail.value.trim() || newPwdLen < 6 || newPwdLen > 10) {
        alert('Preencha todos os campos! Senha deve ter entre 6 e 10 caracteres.');
        return;
      }
      
      // salvar novo usuário
      Session.registerUser(newEmail.value.trim(), newPassword.value);
      wrap.remove();
      resolve({ success: true, email: newEmail.value.trim() });
    };
  });
}
