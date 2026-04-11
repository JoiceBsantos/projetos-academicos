// ../assets/js/modules/doctors.js MEDICO
import { api } from '../services/api.js';
import { Appointments } from '../services/storage.js';
import { paginate, renderPager, showAlert } from '../ui/ui.js';

const tbody = document.getElementById('doctorsTbody');
const alertArea = document.getElementById('alertArea');
const pagerEl = document.getElementById('pagination');
const search = document.getElementById('searchDoctor');
const filterSpecialty = document.getElementById('filterSpecialty');

/* ====== borda da tabela e cabeçalho Ações ====== */
const table = document.getElementById('doctorsTable');
if (table) table.classList.add('table-borda', 'w-full');
const thActions = document.getElementById('thActions');
if (thActions) thActions.classList.add('text-center', 'w-56');

function sortByName(arr) {
  return arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/* ========= helpers ========= */
function digits11(v) {
  return String(v || '').replace(/\D/g, '').slice(0, 11);
}
function formatPhoneBR(v) {
  const d = digits11(v);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
}

function doctorHasFutureAppointments(doctorId) {
  const now = new Date();
  return Appointments.list().some(
    (a) =>
      a.doctorId === doctorId &&
      a.status !== 'cancelada' &&
      a.datetime &&
      new Date(a.datetime) >= now
  );
}

/* ========= popula filtro de especialidades em ordem alfabética ========= */
if (filterSpecialty) {
  filterSpecialty.innerHTML = `
    <option value="">Todas especialidades</option>
    <option value="cardiologia">Cardiologia</option>
    <option value="dermatologia">Dermatologia</option>
    <option value="ginecologia">Ginecologia</option>
    <option value="ortopedia">Ortopedia</option>
  `;
}

/* ========= render ========= */
async function render(page = 1) {
  try {
    const medicos = await api.getMedicos();
    const q = (search?.value || '').toLowerCase();
    const spec = filterSpecialty?.value || '';
    
    const data = sortByName(medicos.map(m => ({
      id: m.id,
      name: m.nome,
      email: m.email,
      crm: m.crm,
      specialty: m.especialidade,
      phone: m.telefone,
      active: m.ativo
    }))).filter((d) => {
      const okQ =
        !q ||
        [d.name, d.email, d.crm].some((v) =>
          String(v).toLowerCase().includes(q)
        );
      const okS = !spec || d.specialty === spec;
      return okQ && okS;
    });

    const state = paginate(data, page, 10);
    tbody.innerHTML = '';

    state.items.forEach((d) => {
    const tr = document.createElement('tr');
    tr.className =
      'transition-colors hover:bg-blue-50 border-b border-gray-200';
    tr.innerHTML = `
      <td class="p-2">${d.name}</td>
      <td class="p-2">${d.email}</td>
      <td class="p-2">${d.crm}</td>
      <td class="p-2">${d.specialty}</td>
      <td class="p-2">
        ${
          d.active
            ? '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">ativo</span>'
            : '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">inativo</span>'
        }
      </td>
      <td class="p-2 text-center align-middle w-56">
        <div class="flex items-center justify-center gap-3 h-full">

          <!-- Editar médico com tooltip -->
          <div class="relative group inline-block">
            <button
              class="btn-edit inline-flex items-center justify-center h-9 w-[84px] text-sm
                     rounded-lg border border-gray-200 text-brand-800 px-3
                     hover:bg-brand-50 transition select-none">
              Editar
            </button>
            <span
              class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                     rounded-md bg-gray-800 text-white text-xs px-2 py-1
                     opacity-0 group-hover:opacity-100 transition-opacity">
              Editar médico
            </span>
          </div>

          <!-- Ativar / Desativar médico com tooltip -->
          <div class="relative group inline-block">
            <button
              class="btn-toggle inline-flex items-center justify-center h-9 w-[104px] text-sm px-3 rounded-lg border transition select-none
                     ${
                       d.active
                         ? 'border-red-200 text-red-700 hover:bg-red-50'
                         : 'border-green-200 text-green-700 hover:bg-green-50'
                     }">
              ${d.active ? 'Desativar' : 'Ativar'}
            </button>
            <span
              class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                     rounded-md bg-gray-800 text-white text-xs px-2 py-1
                     opacity-0 group-hover:opacity-100 transition-opacity">
              ${d.active ? 'Desativar médico' : 'Ativar médico'}
            </span>
          </div>

        </div>
      </td>`;

    tr.querySelector('.btn-edit').addEventListener('click', () =>
      openEditDoctorModal(d)
    );

    // fluxo de ativar/desativar
    tr.querySelector('.btn-toggle').addEventListener('click', async () => {
      if (d.active) {
        // Sempre mostra o modal de confirmação primeiro
        showDeactivateModal(
          {
            nome: d.name,
            especialidade: d.specialty,
            crm: d.crm ? `CRM ${d.crm}` : '',
          },
          async () => {
            try {
              await api.deleteMedico(d.id);
              showAlert(alertArea, 'Médico desativado.');
              render(state.page);
            } catch (error) {
              showAlert(alertArea, error.message, 'error');
            }
          }
        );
      } else {
        try {
          await fetch(`/api/medicos/${d.id}/reativar`);
          showAlert(alertArea, 'Médico reativado.');
          render(state.page);
        } catch (error) {
          showAlert(alertArea, error.message, 'error');
        }
      }
    });

    tbody.appendChild(tr);
  });

    renderPager(pagerEl, state, (p) => render(p));
  } catch (error) {
    console.error('Erro ao carregar médicos:', error);
    showAlert(alertArea, 'Erro ao carregar médicos', 'error');
  }
}

document.getElementById('newDoctorBtn')?.addEventListener('click', openNewDoctorModal);
search?.addEventListener('input', () => render(1));
filterSpecialty?.addEventListener('change', () => render(1));
render(1);

/* =========================
   NOVO MÉDICO — Modal
   ========================= */
function openNewDoctorModal() {
  const root = document.getElementById('modalRoot');
  const wrap = document.createElement('div');
  wrap.className =
    'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';
  document.documentElement.classList.add('overflow-hidden');
  document.body.classList.add('overflow-hidden');

  wrap.innerHTML = `
  <div class="bg-white rounded-3xl shadow-xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden relative">
    <div class="px-5 py-4 bg-brand-800 text-white shrink-0 rounded-t-3xl">
      <h3 class="text-lg font-semibold">Novo perfil</h3>
    </div>

    <div class="p-5 flex-1 overflow-y-auto min-h-0">
      <h4 class="text-brand-700 font-semibold mb-3">Profissional</h4>
      <div class="grid md:grid-cols-2 gap-4">
        <label class="grid gap-1">
          <span class="text-sm text-brand-800">Nome completo *</span>
          <input id="f_name" type="text" class="border rounded-xl px-3 py-2" placeholder="Digite o nome completo">
          <small class="text-xs text-red-600 hidden" id="e_name">Campo obrigatório.</small>
        </label>
        <label class="grid gap-1">
          <span class="text-sm text-brand-800">CRM *</span>
          <input id="f_crm" type="text" inputmode="numeric" maxlength="6" class="border rounded-xl px-3 py-2" placeholder="Digite o CRM (6 números)">
          <small class="text-xs text-red-600 hidden" id="e_crm">Informe 6 dígitos.</small>
        </label>
        <label class="grid gap-1 md:col-span-2">
          <span class="text-sm text-brand-800">Especialidade *</span>
          <select id="f_specialty" class="border rounded-xl px-3 py-2 select-chevron">
            <option value="">Selecione...</option>
            <!-- ordem alfabética -->
            <option>Cardiologia</option>
            <option>Dermatologia</option>
            <option>Ginecologia</option>
            <option>Ortopedia</option>
          </select>
          <small class="text-xs text-red-600 hidden" id="e_specialty">Selecione uma especialidade.</small>
        </label>
      </div>

      <h4 class="text-brand-700 font-semibold mt-6 mb-3">Contatos</h4>
      <div class="grid md:grid-cols-2 gap-4">
        <label class="grid gap-1 md:col-span-2">
          <span class="text-sm text-brand-800">E-mail *</span>
          <input id="f_email" type="email" class="border rounded-xl px-3 py-2" placeholder="seu@email.com">
          <small class="text-xs text-red-600 hidden" id="e_email">Informe um e-mail válido.</small>
        </label>
        <label class="grid gap-1 md:col-span-2">
          <span class="text-sm text-brand-800">Telefone ou celular *</span>
          <input id="f_phone" type="tel" class="border rounded-xl px-3 py-2" placeholder="(00) 000000000">
          <small class="text-xs text-red-600 hidden" id="e_phone">Informe 11 dígitos.</small>
        </label>
      </div>
    </div>

    <div class="p-5 border-t flex flex-col gap-3 bg-white shrink-0 rounded-b-3xl">
      <button id="btnSave" class="w-full rounded-xl px-4 py-2 bg-brand-800 text-white hover:bg-brand-700">Concluir cadastro</button>
      <button id="btnCancel" class="w-full rounded-xl px-4 py-2 border hover:bg-brand-50">Cancelar</button>
    </div>
  </div>
`;

  const rootClose = () => {
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
    wrap.remove();
  };

  root.appendChild(wrap);

  const name = wrap.querySelector('#f_name');
  const crm = wrap.querySelector('#f_crm');
  const specialty = wrap.querySelector('#f_specialty');
  const email = wrap.querySelector('#f_email');
  const phone = wrap.querySelector('#f_phone');

  const eName = wrap.querySelector('#e_name');
  const eCrm = wrap.querySelector('#e_crm');
  const eSpecialty = wrap.querySelector('#e_specialty');
  const eEmail = wrap.querySelector('#e_email');
  const ePhone = wrap.querySelector('#e_phone');

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 6);

  phone.addEventListener('input', () => {
    phone.value = formatPhoneBR(phone.value);
  });
  phone.addEventListener('blur', () => {
    phone.value = formatPhoneBR(phone.value);
  });
  crm.addEventListener('input', () => {
    crm.value = onlyDigits(crm.value);
  });

  function validate() {
    let ok = true;
    if (!name.value.trim()) {
      eName.classList.remove('hidden');
      ok = false;
    } else eName.classList.add('hidden');
    if (onlyDigits(crm.value).length !== 6) {
      eCrm.classList.remove('hidden');
      ok = false;
    } else eCrm.classList.add('hidden');
    if (!specialty.value) {
      eSpecialty.classList.remove('hidden');
      ok = false;
    } else eSpecialty.classList.add('hidden');
    if (!isEmail(email.value.trim())) {
      eEmail.classList.remove('hidden');
      ok = false;
    } else eEmail.classList.add('hidden');
    if (digits11(phone.value).length !== 11) {
      ePhone.classList.remove('hidden');
      ok = false;
    } else ePhone.classList.add('hidden');
    return ok;
  }

  wrap.querySelector('#btnSave').addEventListener('click', async () => {
    if (!validate()) return;
    try {
      await api.createMedico({
        nome: name.value.trim(),
        email: email.value.trim(),
        telefone: formatPhoneBR(phone.value),
        crm: onlyDigits(crm.value),
        especialidade: specialty.value,
      });
      rootClose();
      showAlert(alertArea, 'Médico cadastrado com sucesso.');
      render(1);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      showAlert(alertArea, 'Erro ao cadastrar médico: ' + error.message, 'error');
    }
  });

  wrap.querySelector('#btnCancel').addEventListener('click', rootClose);
}

/* =========================
   EDITAR MÉDICO — Modal
   ========================= */
function openEditDoctorModal(d) {
  const root = document.getElementById('modalRoot');
  const wrap = document.createElement('div');
  wrap.className =
    'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';
  document.documentElement.classList.add('overflow-hidden');
  document.body.classList.add('overflow-hidden');

  wrap.innerHTML = `
  <div data-dialog role="dialog" aria-modal="true" tabindex="-1"
       class="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden relative z-[10000000]">
    <div class="px-5 py-4 bg-brand-800 text-white shrink-0 rounded-t-3xl">
      <h3 class="text-lg font-semibold">Editar</h3>
    </div>

    <div class="p-5 flex-1 overflow-y-auto min-h-0">
      <h4 class="text-brand-700 font-semibold mb-3">Profissional</h4>
      <div class="grid md:grid-cols-2 gap-4">
        <label class="grid gap-1">
          <span class="text-sm text-brand-800">Nome completo *</span>
          <input type="text" value="${d.name || ''}" class="border rounded-xl px-3 py-2 bg-gray-50 text-gray-600" disabled>
          <small class="text-xs text-brand-600">Campo não editável</small>
        </label>
        <label class="grid gap-1">
          <span class="text-sm text-brand-800">CRM *</span>
          <input type="text" value="${d.crm}" class="border rounded-xl px-3 py-2 bg-gray-50 text-gray-600" disabled>
          <small class="text-xs text-brand-600">Campo não editável</small>
        </label>
        <label class="grid gap-1 md:col-span-2">
          <span class="text-sm text-brand-800">Especialidade *</span>
          <select class="border rounded-xl px-3 py-2 bg-gray-50 text-gray-600 select-chevron" disabled>
            <option>${d.specialty}</option>
          </select>
          <small class="text-xs text-brand-600">Campo não editável</small>
        </label>
      </div>

      <h4 class="text-brand-700 font-semibold mt-6 mb-3">Contatos</h4>
      <div class="grid md:grid-cols-2 gap-4">
        <label class="grid gap-1 md:col-span-2">
          <span class="text-sm text-brand-800">E-mail *</span>
          <input id="u_email" type="email" value="${d.email}" class="border rounded-xl px-3 py-2">
          <small class="text-xs text-red-600 hidden" id="u_email_err">Informe um e-mail válido.</small>
        </label>
        <label class="grid gap-1 md:col-span-2">
          <span class="text-sm text-brand-800">Telefone ou celular *</span>
          <input id="u_phone" type="tel" value="${formatPhoneBR(
            d.phone || ''
          )}" class="border rounded-xl px-3 py-2" placeholder="(11) 959564704">
          <small class="text-xs text-red-600 hidden" id="u_phone_err">Informe 11 dígitos.</small>
        </label>
      </div>

      <div class="mt-6 text-center">
        <button id="ed_toggle_active" class="text-brand-800 underline hover:no-underline">
          ${d.active ? 'Desativar este perfil' : 'Ativar este perfil'}
        </button>
      </div>
    </div>

    <div class="p-5 border-t flex flex-col gap-3 bg-white shrink-0 rounded-b-3xl">
      <button id="ed_save" class="w-full rounded-xl px-4 py-2 bg-brand-800 text-white hover:bg-brand-700">Concluir edição</button>
      <button id="ed_cancel" class="w-full rounded-xl px-4 py-2 border hover:bg-brand-50">Cancelar</button>
    </div>
  </div>
`;

  root.appendChild(wrap);

  const dialog = wrap.querySelector('[data-dialog]');
  const uEmail = wrap.querySelector('#u_email');
  const uPhone = wrap.querySelector('#u_phone');
  const phoneErr = wrap.querySelector('#u_phone_err');
  const emailErr = wrap.querySelector('#u_email_err');

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  dialog.focus();
  uEmail?.focus();

  uPhone.addEventListener('input', () => {
    uPhone.value = formatPhoneBR(uPhone.value);
    if (digits11(uPhone.value).length === 11) phoneErr?.classList.add('hidden');
  });
  uPhone.addEventListener('blur', () => {
    uPhone.value = formatPhoneBR(uPhone.value);
  });

  const closeModal = () => {
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
    wrap.remove();
  };
  wrap.querySelector('#ed_cancel').onclick = closeModal;

  wrap.querySelector('#ed_save').onclick = async () => {
    const phoneDigits = digits11(uPhone?.value);
    const emailValue = uEmail?.value.trim();
    
    let hasError = false;
    
    if (phoneDigits.length !== 11) {
      phoneErr?.classList.remove('hidden');
      hasError = true;
    } else {
      phoneErr?.classList.add('hidden');
    }
    
    if (!isEmail(emailValue)) {
      emailErr?.classList.remove('hidden');
      hasError = true;
    } else {
      emailErr?.classList.add('hidden');
    }
    
    if (hasError) {
      return;
    }
    
    try {
      await api.updateMedico(d.id, {
        telefone: formatPhoneBR(phoneDigits),
        email: uEmail.value.trim()
      });
      closeModal();
      showAlert(alertArea, 'Dados do médico atualizados com sucesso.');
      render(1);
    } catch (error) {
      showAlert(alertArea, error.message, 'error');
    }
  };

  // fluxo de ativar/desativar a partir do modal de edição
  wrap.querySelector('#ed_toggle_active').onclick = () => {
    closeModal();

    if (d.active) {
      // Sempre mostra o modal de confirmação primeiro
      showDeactivateModal(
        {
          nome: d.name,
          especialidade: d.specialty,
          crm: d.crm ? `CRM ${d.crm}` : '',
        },
        async () => {
          try {
            await api.deleteMedico(d.id);
            showAlert(alertArea, 'Médico desativado.');
            render(1);
          } catch (error) {
            if (error.message.includes('consultas agendadas')) {
              showCannotDeactivateModal();
            } else {
              showAlert(alertArea, error.message, 'error');
            }
          }
        }
      );
    } else {
      (async () => {
        try {
          await fetch(`/api/medicos/${d.id}/reativar`);
          showAlert(alertArea, 'Médico reativado.');
          render(1);
        } catch (error) {
          showAlert(alertArea, error.message, 'error');
        }
      })();
    }
  };
}

/* =========================
   MODAL DE DESATIVAÇÃO (CONFIRMAÇÃO)
   ========================= */
function showDeactivateModal({ nome, especialidade, crm }, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';

  const nomeLabel = nome || '—';
  const metaLabel = [especialidade, crm].filter(Boolean).join(' | ') || '—';

  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
         role="dialog" aria-modal="true" aria-labelledby="deactTitle">

      <!-- Conteúdo principal -->
      <div class="p-6 flex flex-col items-center text-center gap-4">
        <!-- Ícone topo -->
        <div class="flex items-center justify-center mx-auto mt-4 bg-brand-800"
             style="width: 54px; height: 54px; border-radius: 9999px;">
          <span class="text-2xl text-white">🔕</span>
        </div>

        <!-- Título em negrito -->
        <h3 id="deactTitle" class="text-xl font-bold text-brand-800">
          Deseja desativar este perfil?
        </h3>

        <!-- Nome + meta centralizados, nome em negrito -->
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
          Ao desativar este perfil, suas informações ficarão desabilitadas para pesquisas
          e futuros agendamentos.
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
            class="h-12 rounded-lg bg-brand-800 text-white font-semibold">
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

  // fecha ao clicar fora do card
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // ações dos botões
  overlay.querySelector('#btnCancelDeactivate').onclick = () => overlay.remove();
  overlay.querySelector('#btnConfirmDeactivate').onclick = () => {
    overlay.remove();
    onConfirm && onConfirm();
  };

  // adiciona no DOM
  document.body.appendChild(overlay);

  // foco e ESC
  requestAnimationFrame(() => {
    overlay.querySelector('[role="dialog"]').focus?.();
    const onEsc = (ev) => {
      if (ev.key === 'Escape') {
        overlay.remove();
        window.removeEventListener('keydown', onEsc);
      }
    };
    window.addEventListener('keydown', onEsc);
  });
}

/* =========================
   MODAL “NÃO FOI POSSÍVEL DESATIVAR”
   ========================= */
function showCannotDeactivateModal() {
  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';

  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
         role="dialog" aria-modal="true" aria-labelledby="cantTitle">

      <!-- Cabeçalho -->
      <div class="px-5 py-4 bg-brand-800 text-white">
        <h3 id="cantTitle" class="text-lg font-semibold">
          Não foi possível desativar este perfil
        </h3>
      </div>

      <!-- Conteúdo -->
      <div class="p-6 flex flex-col items-center text-center gap-4">
        <div class="text-yellow-500" style="font-size: 24px;">⚠️</div>
        <p class="text-brand-900 text-sm leading-relaxed max-w-xs">
          Certifique-se de que <strong>não há consultas agendadas</strong>.<br>
          Caso haja, a desativação não poderá ser concluída.
        </p>
      </div>

      <!-- Rodapé -->
      <div class="px-6 py-4 border-t bg-gray-50">
        <div class="flex justify-center">
          <button id="btnCantOk"
            style="width: 380px;"
           class="h-12 rounded-lg bg-brand-800 text-white font-semibold">
            Entendi
          </button>
        </div>
      </div>
    </div>
  `;

  // fecha ao clicar fora
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // botão “Entendi”
  overlay.querySelector('#btnCantOk').onclick = () => overlay.remove();

  // adiciona no DOM
  document.body.appendChild(overlay);

  // foco e ESC
  requestAnimationFrame(() => {
    overlay.querySelector('[role="dialog"]').focus?.();
    const onEsc = (ev) => {
      if (ev.key === 'Escape') {
        overlay.remove();
        window.removeEventListener('keydown', onEsc);
      }
    };
    window.addEventListener('keydown', onEsc);
  });
}
