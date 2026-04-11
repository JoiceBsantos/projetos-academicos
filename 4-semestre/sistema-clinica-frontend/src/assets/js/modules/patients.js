// ../assets/js/modules/patients.js PACIENTES
import { api } from '../services/api.js';
import { Appointments } from '../services/storage.js';
import { paginate, renderPager, showAlert } from '../ui/ui.js';

const tbody     = document.getElementById('patientsTbody');
const alertArea = document.getElementById('alertArea');
const pagerEl   = document.getElementById('pagination');
const search    = document.getElementById('searchPatient');
const thActions = document.getElementById('thActionsPatients');

// Cabeçalho "Ações" alinhado
if (thActions) thActions.classList.add('text-center', 'w-44');

/* ===================== Helpers ===================== */
function sortByName(arr){ return arr.sort((a,b)=> a.name.localeCompare(b.name,'pt-BR')); }

// Apenas dígitos, com limite de 11 (para CPF)
const digits11 = v => String(v||'').replace(/\D/g,'').slice(0,11);

// CPF com máscara progressiva (exibe 000.000.000-00; limita a 11 dígitos reais)
function formatCPF(value) {
  const digits = digits11(value);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    out += digits[i];
    if (i === 2 || i === 5) out += '.';
    if (i === 8) out += '-';
  }
  return out;
}

// Telefone: máscara simples no formato (DD) + resto (até 11 dígitos)
function formatPhoneBR(v){
  const d = String(v||'').replace(/\D/g,'').slice(0,11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  return `(${d.slice(0,2)}) ${d.slice(2)}`;
}

function isEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
}

// Verifica se o paciente possui consultas futuras
function patientHasFutureAppointments(patientId){
  const now = new Date();
  return Appointments.list().some(a =>
    a.patientId === patientId &&
    a.status !== 'cancelada' &&
    a.datetime &&
    new Date(a.datetime) >= now
  );
}

/* ===================== Render tabela ===================== */
async function render(page=1){
  try {
    const pacientes = await api.getPacientes();
    const q = (search?.value || '').toLowerCase();

    const data = sortByName(
      pacientes.map(p => ({
        id: p.id,
        name: p.nome,
        email: p.email,
        cpf: p.cpf,
        phone: p.telefone,
        active: p.ativo,
        _cpfMasked: formatCPF(p.cpf),
        _phoneMasked: formatPhoneBR(p.telefone)
      }))
    ).filter(p=>{
      // permite buscar por nome, e-mail, cpf (com/sem pontuação) e telefone
      const hayText = `${p.name} ${(p.email||'')}`.toLowerCase();
      const hayNums = `${(p._cpfMasked||'').replace(/\D/g,'')} ${String(p.phone||'').replace(/\D/g,'')}`;
      const qNums   = q.replace(/\D/g,'');
      return !q ||
        hayText.includes(q) ||
        (qNums && hayNums.includes(qNums));
    });

    const state = paginate(data, page, 10);
    tbody.innerHTML = '';

  state.items.forEach(p=>{
    const tr = document.createElement('tr');
    tr.className = 'transition-colors hover:bg-blue-50';
    tr.innerHTML = `
      <td class="p-2">${p.name}</td>
      <td class="p-2">${p.email||''}</td>
      <td class="p-2">${p._cpfMasked||''}</td>
      <td class="p-2">${p._phoneMasked||''}</td>

      <!-- Coluna Agendamento -->
      <td class="p-2">
        <div class="relative group inline-block">
          <button
            class="btn-schedule inline-flex items-center justify-center h-9 px-4 text-sm
                   rounded-lg border border-brand-800 text-brand-800 bg-white
                   hover:bg-brand-50 transition select-none">
            Agendar
          </button>
          <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                       rounded-md bg-gray-800 text-white text-xs px-2 py-1
                       opacity-0 group-hover:opacity-100 transition-opacity">
            Agendar consulta
          </span>
        </div>
      </td>

      <!-- Status -->
      <td class="p-2">
        ${
          p.active
            ? '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">ativo</span>'
            : '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">inativo</span>'
        }
      </td>

      <td class="p-2 text-center align-middle w-44">
        <div class="flex items-center justify-center gap-3 h-full">

          <!-- Editar -->
          <div class="relative group inline-block">
            <button
              class="btn-edit inline-flex items-center justify-center h-9 w-[84px] text-sm
                     rounded-lg border border-gray-200 text-brand-800 px-3
                     hover:bg-brand-50 transition select-none">
              Editar
            </button>
            <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                         rounded-md bg-gray-800 text-white text-xs px-2 py-1
                         opacity-0 group-hover:opacity-100 transition-opacity">
              Editar paciente
            </span>
          </div>

          <!-- Ativar/Desativar -->
          <div class="relative group inline-block">
            <button
              class="btn-toggle inline-flex items-center justify-center h-9 w-[104px] text-sm px-3 rounded-lg border transition select-none
                     ${
                       p.active
                         ? 'border-red-200 text-red-700 hover:bg-red-50'
                         : 'border-green-200 text-green-700 hover:bg-green-50'
                     }">
              ${p.active ? 'Desativar' : 'Ativar'}
            </button>
            <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                         rounded-md bg-gray-800 text-white text-xs px-2 py-1
                         opacity-0 group-hover:opacity-100 transition-opacity">
              ${p.active ? 'Desativar paciente' : 'Ativar paciente'}
            </span>
          </div>

        </div>
      </td>
    `;

    // Editar
    tr.querySelector('.btn-edit').addEventListener('click', ()=>openEditPatientModal(p));

    // Agendar -> salva paciente no localStorage e vai para consultas
    tr.querySelector('.btn-schedule').addEventListener('click', ()=>{
      localStorage.setItem('voll.selectedPatient', JSON.stringify({
        id:    p.id,
        name:  p.name,
        email: p.email,
        cpf:   p.cpf,
        phone: p.phone
      }));
      window.location.href = '../pages/appointments.html#nova-consulta';
    });

    // Ativar/Desativar
    tr.querySelector('.btn-toggle').addEventListener('click', async ()=>{
      if (p.active) {
        showDeactivatePatientModal(
          { nome: p.name, cpf: formatCPF(p.cpf) },
          async () => {
            try {
              await api.deletePaciente(p.id);
              showAlert(alertArea, 'Paciente desativado.');
              render(state.page);
            } catch (error) {
              if (error.message.includes('consultas agendadas')) {
                showCannotDeactivatePatientModal();
              } else {
                showAlert(alertArea, error.message, 'error');
              }
            }
          }
        );
      } else {
        try {
          await fetch(`/api/pacientes/${p.id}/reativar`);
          showAlert(alertArea, 'Paciente reativado.');
          render(state.page);
        } catch (error) {
          showAlert(alertArea, error.message, 'error');
        }
      }
    });

    tbody.appendChild(tr);
  });

    renderPager(pagerEl, state, p=>render(p));
  } catch (error) {
    showAlert(alertArea, 'Erro ao carregar pacientes: ' + error.message, 'error');
  }
}

document.getElementById('newPatientBtn')?.addEventListener('click', openNewPatientModal);
search?.addEventListener('input',()=>render(1));
render(1);

/* ===================== NOVO PACIENTE ===================== */
function openNewPatientModal(){
  const root = document.getElementById('modalRoot');
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';
  document.documentElement.classList.add('overflow-hidden');
  document.body.classList.add('overflow-hidden');

  wrap.innerHTML = `
  <div class="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden relative z-[10000000]">
    <div class="px-5 py-4 bg-brand-800 text-white shrink-0 rounded-t-3xl">
      <h3 class="text-lg font-semibold">Novo paciente</h3>
    </div>

    <div class="p-5 flex-1 overflow-y-auto min-h-0 grid gap-5">
      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Nome completo *</span>
        <input id="p_name" type="text" class="border rounded-xl px-3 py-2" placeholder="Digite o nome completo">
        <small id="err_name" class="hidden text-xs text-red-600">Campo obrigatório.</small>
      </label>

      <label class="grid gap-1">
        <span class="text-sm text-brand-800">E-mail *</span>
        <input id="p_email" type="email" class="border rounded-xl px-3 py-2" placeholder="seu@email.com">
        <small id="err_email" class="hidden text-xs text-red-600">Informe um e-mail válido.</small>
      </label>

      <label class="grid gap-1">
        <span class="text-sm text-brand-800">CPF *</span>
        <input id="p_cpf" type="text" inputmode="numeric" class="border rounded-xl px-3 py-2" placeholder="000.000.000-00" maxlength="14">
        <small id="err_cpf" class="hidden text-xs text-red-600">CPF inválido.</small>
      </label>

      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Telefone</span>
        <input id="p_phone" type="tel" class="border rounded-xl px-3 py-2" placeholder="(11) 999999999">
      </label>
    </div>

    <div class="p-5 border-t flex flex-col gap-3 bg-white shrink-0 rounded-b-3xl">
      <button id="p_save" class="w-full rounded-xl px-4 py-2 bg-brand-800 text-white hover:bg-brand-700">Concluir cadastro</button>
      <button id="p_cancel" class="w-full rounded-xl px-4 py-2 border hover:bg-brand-50">Cancelar</button>
    </div>
  </div>
  `;

  root.appendChild(wrap);

  // refs
  const name  = wrap.querySelector('#p_name');
  const email = wrap.querySelector('#p_email');
  const cpf   = wrap.querySelector('#p_cpf');
  const phone = wrap.querySelector('#p_phone');

  const eName  = wrap.querySelector('#err_name');
  const eEmail = wrap.querySelector('#err_email');
  const eCpf   = wrap.querySelector('#err_cpf');

  // máscara CPF (sem contar pontuação — limite 11 dígitos)
  const applyCpfMask = () => { cpf.value = formatCPF(cpf.value); };
  cpf.addEventListener('input', applyCpfMask);
  cpf.addEventListener('blur',  applyCpfMask);

  // máscara telefone (opcional)
  phone?.addEventListener('input', ()=>{ phone.value = formatPhoneBR(phone.value); });
  phone?.addEventListener('blur',  ()=>{ phone.value = formatPhoneBR(phone.value); });

  const closeModal = ()=>{
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
    wrap.remove();
  };
  wrap.querySelector('#p_cancel').onclick = closeModal;

  wrap.querySelector('#p_save').onclick = async ()=>{
    // limpa erros
    eName.classList.add('hidden'); eEmail.classList.add('hidden'); eCpf.classList.add('hidden');

    const nameV  = (name.value||'').trim();
    const emailV = (email.value||'').trim();
    const cpfDig = digits11(cpf.value); // só dígitos reais
    const phoneV = phone.value||'';

    let ok = true;
    if (!nameV){ eName.classList.remove('hidden'); ok = false; }
    if (!isEmail(emailV)){ eEmail.classList.remove('hidden'); ok = false; }
    if (cpfDig.length !== 11){
      eCpf.textContent = 'CPF inválido.';
      eCpf.classList.remove('hidden');
      ok = false;
    }

    if (!ok) return;

    try {
      await api.createPaciente({
        nome: nameV,
        email: emailV,
        cpf: cpfDig,
        telefone: phoneV
      });

      closeModal();
      showAlert(alertArea, 'Paciente cadastrado com sucesso.');
      render(1);
    } catch (error) {
      showAlert(alertArea, error.message, 'error');
    }
  };
}

/* ===================== EDITAR PACIENTE ===================== */
function openEditPatientModal(p){
  const root = document.getElementById('modalRoot');
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';
  document.documentElement.classList.add('overflow-hidden');
  document.body.classList.add('overflow-hidden');

  wrap.innerHTML = `
  <div class="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden relative z-[10000000]">
    <div class="px-5 py-4 bg-brand-800 text-white shrink-0 rounded-t-3xl">
      <h3 class="text-lg font-semibold">Editar paciente</h3>
    </div>

    <div class="p-5 flex-1 overflow-y-auto min-h-0 grid gap-5">
      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Nome completo *</span>
        <input id="e_name" type="text" class="border rounded-xl px-3 py-2" value="${p.name||''}">
      </label>

      <label class="grid gap-1">
        <span class="text-sm text-brand-800">E-mail *</span>
        <input type="email" class="border rounded-xl px-3 py-2 bg-gray-50 text-gray-600" value="${p.email||''}" disabled>
        <small class="text-xs text-brand-600">Campo não editável</small>
      </label>

      <label class="grid gap-1">
        <span class="text-sm text-brand-800">CPF *</span>
        <input type="text" class="border rounded-xl px-3 py-2 bg-gray-50 text-gray-600" value="${formatCPF(p.cpf)}" disabled>
        <small class="text-xs text-brand-600">Campo não editável</small>
      </label>

      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Telefone</span>
        <input id="e_phone" type="tel" class="border rounded-xl px-3 py-2" value="${formatPhoneBR(p.phone||'')}">
      </label>
    </div>

    <div class="p-5 border-t flex flex-col gap-3 bg-white shrink-0 rounded-b-3xl">
      <button id="e_save" class="w-full rounded-xl px-4 py-2 bg-brand-800 text-white hover:bg-brand-700">Concluir edição</button>
      <button id="e_cancel" class="w-full rounded-xl px-4 py-2 border hover:bg-brand-50">Cancelar</button>
    </div>
  </div>
  `;

  root.appendChild(wrap);

  const eName  = wrap.querySelector('#e_name');
  const ePhone = wrap.querySelector('#e_phone');

  ePhone?.addEventListener('input', ()=>{ ePhone.value = formatPhoneBR(ePhone.value); });
  ePhone?.addEventListener('blur',  ()=>{ ePhone.value = formatPhoneBR(ePhone.value); });

  const closeModal = ()=>{
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
    wrap.remove();
  };
  wrap.querySelector('#e_cancel').onclick = closeModal;

  wrap.querySelector('#e_save').onclick = async ()=>{
    try {
      await api.updatePaciente(p.id, {
        nome: (eName.value||'').trim(),
        telefone: ePhone.value||'',
        email: p.email
      });
      closeModal();
      showAlert(alertArea, 'Dados do paciente atualizados com sucesso.');
      render(1);
    } catch (error) {
      showAlert(alertArea, error.message, 'error');
    }
  };
}

/* =========================
   MODAL DE DESATIVAÇÃO (PACIENTE)
   ========================= */
function showDeactivatePatientModal({ nome, cpf }, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';

  const nomeLabel = nome || '—';
  const metaLabel = cpf || '—';

  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
         role="dialog" aria-modal="true" aria-labelledby="deactPatientTitle">

      <!-- Conteúdo principal -->
      <div class="p-6 flex flex-col items-center text-center gap-4">
        <!-- Ícone topo -->
        <div class="flex items-center justify-center mx-auto mt-4 bg-brand-800"
             style="width: 54px; height: 54px; border-radius: 9999px;">
          <span class="text-2xl text-white">🔕</span>
        </div>

        <!-- Título em negrito -->
        <h3 id="deactPatientTitle" class="text-xl font-bold text-brand-800 mt-2">
          Deseja desativar este paciente?
        </h3>

        <!-- Nome + CPF -->
        <div class="mt-1">
          <div class="text-brand-900 font-bold">
            ${nomeLabel}
          </div>
          <div class="text-sm text-gray-600">
            ${metaLabel}
          </div>
        </div>

        <!-- Texto explicativo -->
        <p class="text-brand-900 text-sm leading-relaxed max-w-md">
          Ao desativar este paciente, suas informações ficarão desabilitadas para novos agendamentos.
        </p>
        <p class="text-brand-900 text-sm leading-relaxed max-w-md">
          Certifique-se que não há consultas agendadas; caso tenha, a desativação não poderá ser concluída.
        </p>
      </div>

      <!-- Rodapé com botões -->
      <div class="px-6 py-4 border-t bg-gray-50">
        <div class="flex flex-col gap-3 items-center">
          <button id="btnConfirmDeactivate"
            style="width: 480px"
            class="h-12 rounded-lg bg-brand-800 text-white font-semibold hover:bg-brand-700">
            Desativar este perfil
          </button>
          <button id="btnCancelDeactivate"
             style="width: 480px"
             class="h-12 rounded-lg border border-brand-800 text-brand-800 font-semibold bg-white hover:bg-brand-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#btnCancelDeactivate').onclick = () => overlay.remove();
  overlay.querySelector('#btnConfirmDeactivate').onclick = () => {
    overlay.remove();
    onConfirm && onConfirm();
  };

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.querySelector('[role="dialog"]').focus?.();
    const onEsc = ev => {
      if (ev.key === 'Escape') {
        overlay.remove();
        window.removeEventListener('keydown', onEsc);
      }
    };
    window.addEventListener('keydown', onEsc);
  });
}

/* =========================
   MODAL “NÃO FOI POSSÍVEL DESATIVAR” (PACIENTE)
   ========================= */
function showCannotDeactivatePatientModal() {
  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';

  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
         role="dialog" aria-modal="true" aria-labelledby="cantPatientTitle">

      <!-- Cabeçalho -->
      <div class="px-5 py-4 bg-brand-800 text-white">
        <h3 id="cantPatientTitle" class="text-lg font-semibold">
          Não foi possível desativar este paciente
        </h3>
      </div>

      <!-- Conteúdo -->
      <div class="p-6 flex flex-col items-center text-center gap-4">
        <div class="text-yellow-500" style="font-size: 24px;">⚠️</div>
        <p class="text-brand-900 text-sm leading-relaxed max-w-xs">
          Certifique-se de que <strong>não há consultas agendadas</strong> para este paciente.<br>
          Caso haja, a desativação não poderá ser concluída.
        </p>
      </div>

      <!-- Rodapé -->
      <div class="px-6 py-4 border-t bg-gray-50">
        <div class="flex justify-center">
          <button id="btnCantOk"
            style="width: 380px;"
            class="h-12 rounded-lg bg-brand-800 text-white font-semibold hover:bg-brand-700">
            Entendi
          </button>
        </div>
      </div>
    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#btnCantOk').onclick = () => overlay.remove();

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.querySelector('[role="dialog"]').focus?.();
    const onEsc = ev => {
      if (ev.key === 'Escape') {
        overlay.remove();
        window.removeEventListener('keydown', onEsc);
      }
    };
    window.addEventListener('keydown', onEsc);
  });
}
