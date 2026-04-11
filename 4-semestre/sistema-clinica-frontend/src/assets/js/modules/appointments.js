// ../assets/js/modules/appointments.js  AGENDAMENTOS
import { api } from '../services/api.js';

import { confirmModal, paginate, renderPager, showAlert } from '../ui/ui.js';

const tbody     = document.getElementById('appointmentsTbody');
const alertArea = document.getElementById('alertArea');
const pagerEl   = document.getElementById('pagination');
const search    = document.getElementById('searchAppointment');

// Armazena status modificados localmente
const statusModificados = new Map();

// Carrega status salvos do localStorage
function carregarStatusSalvos() {
  const salvos = localStorage.getItem('consultasReativadas');
  if (salvos) {
    const dados = JSON.parse(salvos);
    dados.forEach(id => statusModificados.set(id, 'agendada'));
  }
}

// Salva status no localStorage
function salvarStatus(id) {
  const salvos = JSON.parse(localStorage.getItem('consultasReativadas') || '[]');
  if (!salvos.includes(id)) {
    salvos.push(id);
    localStorage.setItem('consultasReativadas', JSON.stringify(salvos));
  }
}

const thActions = document.getElementById('thActionsAppointments');
if (thActions) thActions.classList.add('text-center', 'w-44');

/* ============= Helpers de data/tempo ============= */

function parseLocalDT(value) {
  if (!value) return null;
  const [date, time] = value.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm]   = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}
function floorToMinute(dt) { const d = new Date(dt); d.setSeconds(0,0); return d; }
function isSameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function isClinicOpenDay(dt){const day=dt.getDay();return day>=1&&day<=6;} // seg..sáb
function isClinicOpenHour(start){const m=start.getHours()*60+start.getMinutes();return m>=420 && m<=1080;} // 07:00..18:00
function isAtLeast30MinAhead(start){return start - new Date() >= 30*60*1000;}
function isAtLeast24hAhead(start){
  const agora = new Date();
  const dataConsulta = new Date(start);
  const diferencaHoras = (dataConsulta - agora) / (1000 * 60 * 60);
  console.log('Validação 24h:', { agora, dataConsulta, diferencaHoras });
  return diferencaHoras >= 24;
}
function fmtDateTime(v){
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d)) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/* ======= Helpers adicionais ======= */
function pad2(n){return String(n).padStart(2,'0');}
function formatHM(d){ return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function parseYMD(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y, m-1, d, 0,0,0,0); }
function isToday(d){ const n=new Date(); return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); }

/** dígitos do CPF (até 11) + máscara simples */
const digits11 = v => String(v||'').replace(/\D/g,'').slice(0,11);
function formatCPF(v){
  const d = digits11(v);
  let out = '';
  for (let i = 0; i < d.length; i++){
    out += d[i];
    if (i === 2 || i === 5) out += '.';
    if (i === 8) out += '-';
  }
  return out;
}

/** todos os horários possíveis (30 em 30) das 07:00 às 18:00 (início) */
function allDaySlots(dateObj){
  const slots=[];
  const base=new Date(dateObj); base.setHours(7,0,0,0);     // 07:00
  const end =new Date(dateObj); end.setHours(18,0,0,0);     // último início permitido
  for (let t=new Date(base); t<=end; t=new Date(t.getTime()+30*60*1000)){
    slots.push(formatHM(t));
  }
  return slots;
}

/** horários bloqueados (HH:mm) p/ médico no dia — início e +30 min (consulta dura 1h) */
async function blockedSlotsForDoctor(doctorId, dayObj){
  const blocked = new Set();
  const consultas = await api.getConsultas();
  consultas
    .filter(c => c.id_medico===doctorId && c.status!=='cancelada')
    .forEach(c=>{
      const dt = new Date(`${c.data}T${c.hora}`);
      if (isSameDay(dt, dayObj)) {
        const h1 = formatHM(dt);
        const h2 = formatHM(new Date(dt.getTime()+30*60*1000));
        blocked.add(h1); blocked.add(h2);
      }
    });
  return blocked;
}

/** antecedência de 30 min quando a data é hoje */
function filterByLeadTime(slots, dayObj){
  if (!isToday(dayObj)) return slots;
  const min = new Date(Date.now()+30*60*1000); // agora +30min
  return slots.filter(hm=>{
    const [hh,mm]=hm.split(':').map(Number);
    const cand = new Date(dayObj); cand.setHours(hh,mm,0,0);
    return cand >= min;
  });
}

/* ============= Regras de conflito ============= */

async function patientHasAppointmentSameDay(patientId, start) {
  const consultas = await api.getConsultas();
  return consultas.some(c => c.id_paciente===patientId && c.status!=='cancelada' && isSameDay(new Date(`${c.data}T${c.hora}`), start));
}
async function doctorBusyAt(doctorId, start) {
  const consultas = await api.getConsultas();
  return consultas.some(c => {
    if (c.id_medico === doctorId && c.status !== 'cancelada') {
      const consultaDate = new Date(`${c.data.substring(0,10)}T${c.hora}`);
      return consultaDate.getTime() === start.getTime();
    }
    return false;
  });
}

/* ============= Render da tabela ============= */

async function render(page=1){
  try {
    // Carrega status salvos
    carregarStatusSalvos();
    
    const consultas = await api.getConsultas();
    const q=(search?.value||'').toLowerCase();

    const withNames = consultas.map(c => {
      console.log('Data original:', c.data, 'Hora original:', c.hora);
      return {
        id: c.id,
        patientId: c.id_paciente,
        doctorId: c.id_medico,
        datetime: c.data && c.hora ? `${c.data}T${c.hora}` : '',
        status: statusModificados.get(c.id) || c.status,
        cancelReason: c.motivo_cancelamento,
        _patientName: c.paciente_nome || '-',
        _doctorName: c.medico_nome || '-',
        _specialty: c.especialidade || '-',
        _dataFormatada: c.data ? c.data.substring(0,10).split('-').reverse().join('/') : '',
        _horaFormatada: c.hora ? c.hora.substring(0,5) : ''
      };
    });

    const filtered = withNames
      .filter(a => a.datetime && a.datetime.trim() !== '')
      .filter(a=>{
        const hay = `${a._patientName} ${a._doctorName} ${a.status} ${fmtDateTime(a.datetime)}`.toLowerCase();
        return !q || hay.includes(q);
      });

    const state = paginate(filtered.sort((a,b)=>new Date(a.datetime)-new Date(b.datetime)), page, 10);
    tbody.innerHTML='';

  state.items.forEach(a=>{
    const tr=document.createElement('tr');
    tr.className='transition-colors hover:bg-blue-50';
    tr.innerHTML=`
      <td class="p-2">${a._patientName}</td>
      <td class="p-2">${a._doctorName}</td>
      <td class="p-2">${a._dataFormatada && a._horaFormatada ? `${a._dataFormatada} ${a._horaFormatada}` : '-'}</td>
      <td class="p-2">
        ${a.status==='agendada'
          ? '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">agendada</span>'
          : a.status==='realizada'
            ? '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">realizada</span>'
            : '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">cancelada</span>'}
      </td>
      <td class="p-2 text-center align-middle w-44">
        <div class="flex items-center justify-center gap-3 h-full">
          <div class="relative group inline-block">
            <button class="btn-reschedule inline-flex items-center justify-center h-9 w-[88px] text-sm rounded-lg border border-gray-200 text-brand-800 px-3 hover:bg-brand-50 transition">Reagendar</button>
            <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">Reagendar consulta</span>
          </div>
          <div class="relative group inline-block">
            <button class="btn-cancel inline-flex items-center justify-center h-9 w-[88px] text-sm px-3 rounded-lg border transition ${a.status==='cancelada'?'border-green-200 text-green-700 hover:bg-green-50':'border-red-200 text-red-700 hover:bg-red-50'}">${a.status==='cancelada'?'Reativar':'Cancelar'}</button>
            <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">${a.status==='cancelada'?'Reativar consulta':'Cancelar consulta'}</span>
          </div>
        </div>
      </td>
    `;
    tr.querySelector('.btn-reschedule').addEventListener('click',()=>openRescheduleModal(a));
    tr.querySelector('.btn-cancel').addEventListener('click', async ()=>{
      if(a.status==='cancelada'){
        // Reativa localmente e salva
        statusModificados.set(a.id, 'agendada');
        salvarStatus(a.id);
        showAlert(alertArea, 'Consulta reativada.');
        render(state.page);
      }else{ 
        openCancelModal(a,state.page); 
      }
    });
    tbody.appendChild(tr);
  });

    renderPager(pagerEl,state,p=>render(p));
  } catch (error) {
    showAlert(alertArea, 'Erro ao carregar consultas: ' + error.message, 'error');
  }
}

/* botão "Nova consulta" sem paciente pré-selecionado */
document.getElementById('newAppointmentBtn')?.addEventListener('click', () => openNewAppointmentModal());

search?.addEventListener('input',()=>render(1));
render(1);

/* =======================================================
   AUTO-ABRIR NOVA CONSULTA COM PACIENTE PRÉ-SELECIONADO
   ======================================================= */
(function autoOpenNewFromPatient(){
  const stored = localStorage.getItem('voll.selectedPatient');
  if (!stored) return;

  let patient;
  try {
    patient = JSON.parse(stored);
  } catch (e) {
    console.error('Erro ao ler voll.selectedPatient', e);
    localStorage.removeItem('voll.selectedPatient');
    return;
  }

  localStorage.removeItem('voll.selectedPatient');
  openNewAppointmentModal(patient);
})();

/* ============= NOVA CONSULTA — Modal (listas + horários filtrados) ============= */
/**
 * @param {object} prefilledPatient - opcional, vindo da tela de Pacientes
 *        ex: { id, name, email, cpf, phone }
 */
async function openNewAppointmentModal(prefilledPatient){
  const root=document.getElementById('modalRoot');
  const wrap=document.createElement('div');
  wrap.className='fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';
  document.documentElement.classList.add('overflow-hidden');
  document.body.classList.add('overflow-hidden');

  // Carregar dados da API
  let patientsAll = [];
  let doctorsAll = [];
  let specialties = [];
  
  try {
    const [pacientes, medicos] = await Promise.all([
      api.getPacientes(),
      api.getMedicos()
    ]);
    
    patientsAll = pacientes.map(p => ({
      id: p.id,
      name: p.nome,
      email: p.email,
      cpf: p.cpf,
      phone: p.telefone,
      active: p.ativo
    })).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    
    doctorsAll = medicos.map(d => ({
      id: d.id,
      name: d.nome,
      email: d.email,
      crm: d.crm,
      specialty: d.especialidade,
      phone: d.telefone,
      active: d.ativo
    })).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    
    specialties = ['cardiologia', 'dermatologia', 'ginecologia', 'ortopedia'];
  } catch (error) {
    showAlert(alertArea, 'Erro ao carregar dados: ' + error.message, 'error');
    return;
  }

  function renderPatientOptions(){
    return ['<option value="">Selecione...</option>']
      .concat(
        patientsAll.map(p=>`<option value="${p.id}">${p.name}</option>`)
      ).join('');
  }
  function renderDoctorOptions(spec){
    if(!spec) return '<option value="">Selecione uma especialidade acima</option>';
    const list = doctorsAll.filter(d=>d.active && d.specialty===spec);
    if(!list.length) return '<option value="">Nenhum médico disponível para a especialidade</option>';
    return ['<option value="">Selecione...</option>']
      .concat(list.map(d=>`<option value="${d.id}">${d.name} — ${d.specialty}</option>`))
      .join('');
  }

  wrap.innerHTML=`
  <div class="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden relative z-[10000000]">
    <div class="px-5 py-4 bg-brand-800 text-white shrink-0 rounded-t-3xl">
      <h3 class="text-lg font-semibold">Nova consulta</h3>
    </div>

    <div class="p-5 flex-1 overflow-y-auto min-h-0 grid gap-5">
      <!-- Paciente -->
      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Paciente <span class="text-red-600">*</span></span>
        <select id="n_patient" class="border rounded-xl px-3 py-2 select-chevron">
          ${renderPatientOptions()}
        </select>
        <small id="err_patient" class="hidden text-xs text-red-600">Selecione um paciente ativo.</small>

        <!-- Dados do paciente selecionado -->
        <div id="n_patient_info" class="mt-2 hidden text-sm text-gray-700 bg-gray-50 border rounded-xl px-3 py-2">
          <p><span class="font-semibold">E-mail:</span> <span id="n_patient_email">-</span></p>
          <p><span class="font-semibold">CPF:</span> <span id="n_patient_cpf">-</span></p>
          <p><span class="font-semibold">Telefone:</span> <span id="n_patient_phone">-</span></p>
        </div>
      </label>

      <!-- Especialidade -->
      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Especialidade <span class="text-red-600">*</span></span>
        <select id="n_specialty" class="border rounded-xl px-3 py-2 select-chevron">
          <option value="">Selecione...</option>
          ${specialties.map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select>
        <small id="err_specialty" class="hidden text-xs text-red-600">Selecione uma especialidade.</small>
      </label>

      <!-- Médico (filtra pela especialidade) -->
      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Médico <span class="text-red-600">*</span></span>
        <select id="n_doctor" class="border rounded-xl px-3 py-2 select-chevron">
          <option value="">Selecione uma especialidade acima</option>
        </select>
        <small id="err_doctor" class="hidden text-xs text-red-600">Selecione um médico válido.</small>
      </label>

      <!-- Data e Hora (hora é filtrada dinamicamente) -->
      <div class="grid md:grid-cols-2 gap-4">
        <label class="grid gap-1">
          <span class="text-sm text-brand-800">Data <span class="text-red-600">*</span></span>
          <input id="n_date" type="date" class="border rounded-xl px-3 py-2">
        </label>
        <label class="grid gap-1">
          <span class="text-sm text-brand-800">Hora <span class="text-red-600">*</span></span>
          <select id="n_time" class="border rounded-xl px-3 py-2 select-chevron">
            <option value="">Selecione a data e o médico</option>
          </select>
        </label>
      </div>
      <small id="err_dt" class="hidden text-xs text-red-600">Informe uma data e hora válidas (seg–sáb, 07:00–19:00; início até 18:00; 30 min de antecedência).</small>

      <div id="err_logic" class="hidden alert alert-error"></div>
    </div>

    <div class="p-5 border-t flex flex-col gap-3 bg-white shrink-0 rounded-b-3xl">
      <button id="n_save" class="w-full rounded-xl px-4 py-2 bg-brand-800 text-white hover:bg-brand-700">Agendar consulta</button>
      <button id="n_cancel" class="w-full rounded-xl px-4 py-2 border hover:bg-brand-50">Cancelar</button>
    </div>
  </div>
  `;

  document.getElementById('modalRoot').appendChild(wrap);

  // Refs
  const selPatient   = wrap.querySelector('#n_patient');
  const selSpec      = wrap.querySelector('#n_specialty');
  const selDoctor    = wrap.querySelector('#n_doctor');
  const inpDate      = wrap.querySelector('#n_date');
  const selTime      = wrap.querySelector('#n_time');

  const infoBox      = wrap.querySelector('#n_patient_info');
  const infoEmail    = wrap.querySelector('#n_patient_email');
  const infoCpf      = wrap.querySelector('#n_patient_cpf');
  const infoPhone    = wrap.querySelector('#n_patient_phone');

  // Erros
  const ePatient=wrap.querySelector('#err_patient');
  const eSpec   =wrap.querySelector('#err_specialty');
  const eDoctor =wrap.querySelector('#err_doctor');
  const eDt     =wrap.querySelector('#err_dt');
  const eLogic  =wrap.querySelector('#err_logic');

  // 🔹 Bloquear datas passadas no calendário nativo
  {
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const minStr = `${todayOnly.getFullYear()}-${pad2(todayOnly.getMonth()+1)}-${pad2(todayOnly.getDate())}`;
    inpDate.min = minStr;
  }

  // Atualiza card de dados do paciente
  function updatePatientInfo(){
    const id = selPatient.value;
    const p = patientsAll.find(pp => String(pp.id) === String(id));
    if (!p){
      infoBox.classList.add('hidden');
      infoEmail.textContent = '-';
      infoCpf.textContent   = '-';
      infoPhone.textContent = '-';
      return;
    }
    infoEmail.textContent = p.email || '-';
    infoCpf.textContent   = formatCPF(p.cpf);
    infoPhone.textContent = p.phone || '-';
    infoBox.classList.remove('hidden');
  }

  selPatient.addEventListener('change', updatePatientInfo);

  // ✅ Se veio da tela de Pacientes, já seleciona o paciente e mostra dados
  if (prefilledPatient && prefilledPatient.id != null) {
    selPatient.value = String(prefilledPatient.id);
    ePatient.classList.add('hidden');
    updatePatientInfo();
  }

  // Atualiza médicos quando muda a especialidade
  function refreshDoctors(){
    selDoctor.innerHTML = renderDoctorOptions(selSpec.value);
    (async () => {
      await refreshTimes();
    })();
  }

  // Monta horários disponíveis com base em médico + data
  async function refreshTimes(){
    const docId = selDoctor.value;
    const dateStr = inpDate.value;
    if(!docId || !dateStr){
      selTime.innerHTML = `<option value="">Selecione a data e o médico</option>`;
      return;
    }
    const day = parseYMD(dateStr);
    if(!isClinicOpenDay(day)){
      selTime.innerHTML = `<option value="">Clínica fechada nesse dia</option>`;
      return;
    }

    let slots = allDaySlots(day);
    const blocked = await blockedSlotsForDoctor(docId, day);
    slots = slots.filter(hm => !blocked.has(hm));
    slots = filterByLeadTime(slots, day);

    if(!slots.length){
      selTime.innerHTML = `<option value="">Sem horários disponíveis</option>`;
      return;
    }
    selTime.innerHTML = [`<option value="">Selecione...</option>`, ...slots.map(h=>`<option value="${h}">${h}</option>`)].join('');
  }

  selSpec.addEventListener('change', refreshDoctors);
  selDoctor.addEventListener('change', async () => {
    await refreshTimes();
  });

  // 🔹 Validação de data (bloquear domingos e datas passadas)
  function handleNewDateChange(){
    eDt.classList.add('hidden');
    eDt.textContent = 'Informe uma data e hora válidas (seg–sáb, 07:00–19:00; início até 18:00; 30 min de antecedência).';

    const value = inpDate.value;
    if (!value){
      selTime.innerHTML = `<option value="">Selecione a data e o médico</option>`;
      return;
    }

    const d = parseYMD(value);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // datas passadas (caso o browser deixe selecionar)
    if (d < todayOnly){
      inpDate.value = '';
      selTime.innerHTML = `<option value="">Selecione a data e o médico</option>`;
      eDt.textContent = 'Não é possível agendar para datas passadas.';
      eDt.classList.remove('hidden');
      return;
    }

    // domingo
    if (d.getDay() === 0){
      inpDate.value = '';
      selTime.innerHTML = `<option value="">Selecione a data e o médico</option>`;
      eDt.textContent = 'Não é possível agendar aos domingos.';
      eDt.classList.remove('hidden');
      return;
    }

    refreshTimes();
  }

  inpDate.addEventListener('change', handleNewDateChange);

  const closeModal=()=>{ document.documentElement.classList.remove('overflow-hidden'); document.body.classList.remove('overflow-hidden'); wrap.remove(); };
  wrap.querySelector('#n_cancel').onclick = closeModal;

  // Salvar
  wrap.querySelector('#n_save').onclick = async ()=>{
    ePatient.classList.add('hidden'); eSpec.classList.add('hidden');
    eDoctor.classList.add('hidden');  eDt.classList.add('hidden');
    eLogic.classList.add('hidden');   eLogic.textContent='';

    const patient = patientsAll.find(p=>String(p.id)===String(selPatient.value));
    if(!patient || !patient.active){ ePatient.classList.remove('hidden'); return; }

    const specialty = selSpec.value;
    if(!specialty){ eSpec.classList.remove('hidden'); return; }

    const doctor = doctorsAll.find(d=>String(d.id)===String(selDoctor.value));
    if(!doctor || !doctor.active || doctor.specialty!==specialty){ eDoctor.classList.remove('hidden'); return; }

    const dateStr = inpDate.value;
    const timeStr = selTime.value;
    if(!dateStr || !timeStr){ eDt.classList.remove('hidden'); return; }

    const [H,M]=timeStr.split(':').map(Number);
    const start = parseYMD(dateStr); start.setHours(H,M,0,0);

    if(!isClinicOpenDay(start) || !isClinicOpenHour(start) || !isAtLeast30MinAhead(start)){
      eDt.classList.remove('hidden'); return; }

    if(await patientHasAppointmentSameDay(patient.id, start)){
      eLogic.textContent='Este paciente já possui consulta no mesmo dia.'; eLogic.classList.remove('hidden'); return;
    }
    if(await doctorBusyAt(doctor.id, start)){
      eLogic.textContent='Este médico já possui outra consulta nesse horário.'; eLogic.classList.remove('hidden'); return;
    }

    try {
      await api.createConsulta({
        id_paciente: patient.id,
        id_medico: doctor.id,
        data: dateStr,
        hora: timeStr + ':00'
      });

      closeModal();
      showAlert(alertArea, `Consulta agendada para ${fmtDateTime(start)}.`);
      render(1);
    } catch (error) {
      eLogic.textContent = error.message;
      eLogic.classList.remove('hidden');
    }
  };
}

/* ============= CANCELAR CONSULTA — Modal ============= */
function openCancelModal(a, pageToReturn = 1){
  const root = document.getElementById('modalRoot');
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';
  document.documentElement.classList.add('overflow-hidden');
  document.body.classList.add('overflow-hidden');

  const doctor  = { name: a._doctorName, specialty: a._specialty };
  const patient = { name: a._patientName };

  const clinicianLine = [
    doctor.specialty ? doctor.specialty : null,
    doctor.crm ? `CRM ${doctor.crm}` : null
  ].filter(Boolean).join(' | ');

  wrap.innerHTML = `
  <div class="bg-white rounded-3xl shadow-xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden relative z-[10000000]">
    <div class="px-5 py-4 bg-brand-800 text-white shrink-0 rounded-t-3xl">
      <h3 class="text-lg font-semibold">Deseja cancelar esta consulta?</h3>
    </div>

    <div class="p-5 flex-1 overflow-y-auto min-h-0 grid gap-5">
      <div class="border rounded-xl p-4 bg-white">
        <div class="flex gap-3">
          <div class="w-1 rounded bg-brand-600"></div>
          <div class="flex-1">
            <p class="text-brand-900 font-semibold">${fmtDateTime(a.datetime)}</p>
            <p class="text-brand-900 mt-1">${doctor.name || 'Médico não encontrado'}</p>
            <p class="text-sm text-gray-600">${clinicianLine || ''}</p>
            <p class="text-brand-900 mt-2">${patient.name || 'Paciente não encontrado'}</p>
            <p class="text-sm text-gray-600">Paciente</p>
          </div>
        </div>
      </div>

      <div>
        <p class="text-brand-900 mb-2">Selecione abaixo o motivo do cancelamento:</p>
        <label class="grid gap-1">
          <select id="c_reason" class="border rounded-xl px-3 py-2 select-chevron">
            <option value="">Motivo do cancelamento</option>
            <option value="paciente desistiu">paciente desistiu</option>
            <option value="médico cancelou">médico cancelou</option>
            <option value="outros">outros</option>
          </select>
          <small id="c_reason_err" class="hidden text-xs text-red-600">Selecione um motivo.</small>
        </label>
        <div id="c_time_err" class="hidden alert alert-error mt-3">Só é possível cancelar com pelo menos 24 horas de antecedência.</div>
      </div>
    </div>

    <div class="p-5 border-t flex flex-col gap-3 bg-white shrink-0 rounded-b-3xl">
      <button id="c_ok" disabled
        class="w-full rounded-xl px-4 py-2 bg-brand-800 text-white opacity-50 cursor-not-allowed">
        Confirmar cancelamento
      </button>
      <button id="c_cancel" class="w-full rounded-xl px-4 py-2 border hover:bg-brand-50">Voltar</button>
    </div>
  </div>`;
  root.appendChild(wrap);

  const selReason = wrap.querySelector('#c_reason');
  const errReason = wrap.querySelector('#c_reason_err');
  const errTime   = wrap.querySelector('#c_time_err');
  const btnOk     = wrap.querySelector('#c_ok');

  const setConfirmEnabled = (on) => {
    btnOk.disabled = !on;
    if (on) {
      btnOk.classList.remove('opacity-50','cursor-not-allowed');
      btnOk.classList.add('hover:bg-brand-700');
    } else {
      btnOk.classList.add('opacity-50','cursor-not-allowed');
      btnOk.classList.remove('hover:bg-brand-700');
    }
  };

  selReason.addEventListener('change', () => {
    setConfirmEnabled(Boolean(selReason.value));
    errReason.classList.add('hidden');
  });

  const closeModal = () => {
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
    wrap.remove();
  };
  wrap.querySelector('#c_cancel').onclick = closeModal;

  btnOk.onclick = async () => {
    errReason.classList.add('hidden');
    errTime.classList.add('hidden');

    if (!selReason.value) {
      errReason.classList.remove('hidden');
      return;
    }
    // Construir data correta usando dados formatados
    let appointmentDate;
    
    if (a._dataFormatada && a._horaFormatada) {
      const [dia, mes, ano] = a._dataFormatada.split('/');
      const [hora, minuto] = a._horaFormatada.split(':');
      appointmentDate = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto));
    } else {
      appointmentDate = new Date();
    }
    
    console.log('Data construída:', appointmentDate, 'Ano:', appointmentDate.getFullYear());
    
    // Apenas para consultas de 2025 em diante, aplicar regra de 24h
    if (appointmentDate.getFullYear() >= 2025) {
      if (!isAtLeast24hAhead(appointmentDate)) {
        errTime.classList.remove('hidden');
        return;
      }
    }


    try {
      await api.cancelConsulta(a.id, selReason.value);
      closeModal();
      showAlert(alertArea, 'Consulta cancelada.');
      render(pageToReturn);
    } catch (error) {
      showAlert(alertArea, error.message, 'error');
    }
  };
}

/* ============= REAGENDAR — Modal (com horários filtrados) ============= */
async function openRescheduleModal(a){
  const root=document.getElementById('modalRoot');
  const wrap=document.createElement('div');
  wrap.className='fixed inset-0 bg-black/40 z-[9999999] flex items-center justify-center p-4';
  document.documentElement.classList.add('overflow-hidden');
  document.body.classList.add('overflow-hidden');

  let patientsAll = [];
  let doctorsAll = [];
  let patient = null;
  let doctorAtual = null;
  
  try {
    const [pacientes, medicos] = await Promise.all([
      api.getPacientes(),
      api.getMedicos()
    ]);
    
    patientsAll = pacientes.map(p => ({
      id: p.id,
      name: p.nome,
      active: p.ativo
    }));
    
    doctorsAll = medicos.map(d => ({
      id: d.id,
      name: d.nome,
      specialty: d.especialidade,
      active: d.ativo
    })).sort((x,y)=>x.name.localeCompare(y.name,'pt-BR'));
    
    patient = patientsAll.find(p=>String(p.id)===String(a.patientId));
    doctorAtual = doctorsAll.find(d=>String(d.id)===String(a.doctorId));
  } catch (error) {
    showAlert(alertArea, 'Erro ao carregar dados: ' + error.message, 'error');
    return;
  }
  const espec = doctorAtual?.specialty || '';

  const dt = new Date(a.datetime);
  let dateStr = '';
  let timeStr = '';
  
  if (!isNaN(dt.getTime())) {
    dateStr = `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
    timeStr = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
  }

  function renderDoctorOptions(){
    const list = doctorsAll.filter(d=>d.active && d.specialty===espec);
    return list.map(d=>`<option value="${d.id}" ${d.id===a.doctorId?'selected':''}>${d.name}</option>`).join('');
  }

  wrap.innerHTML=`
  <div class="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden relative z-[10000000]">
    <div class="px-5 py-4 bg-brand-800 text-white shrink-0 rounded-t-3xl"><h3 class="text-lg font-semibold">Reagendar consulta</h3></div>
    <div class="p-5 flex-1 overflow-y-auto min-h-0 grid gap-5">
      <div><p class="text-sm"><strong>Paciente:</strong> ${patient?.name || '(não encontrado)'}</p></div>

      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Especialidade</span>
        <input type="text" disabled value="${espec}" class="border rounded-xl px-3 py-2 bg-gray-50">
      </label>

      <label class="grid gap-1">
        <span class="text-sm text-brand-800">Médico <span class="text-red-600">*</span></span>
        <select id="r_doctor" class="border rounded-xl px-3 py-2 select-chevron">
          ${renderDoctorOptions()}
        </select>
        <small id="err_doc" class="hidden text-xs text-red-600">Selecione um médico válido.</small>
      </label>

      <div class="grid md:grid-cols-2 gap-4">
        <label class="grid gap-1">
          <span class="text-sm text-brand-800">Data <span class="text-red-600">*</span></span>
          <input id="r_date" type="date" ${dateStr ? `value="${dateStr}"` : ''} class="border rounded-xl px-3 py-2">
        </label>
        <label class="grid gap-1">
          <span class="text-sm text-brand-800">Hora <span class="text-red-600">*</span></span>
          <select id="r_time" class="border rounded-xl px-3 py-2 select-chevron"></select>
        </label>
      </div>
      <small id="err_dt" class="hidden text-xs text-red-600">Informe uma data e hora válidas (seg–sáb, 07:00–19:00; início até 18:00; 30 min de antecedência).</small>

      <div id="err_logic" class="hidden alert alert-error"></div>
    </div>

    <div class="p-5 border-t flex flex-col gap-3 bg-white shrink-0 rounded-b-3xl">
      <button id="r_save" class="w-full rounded-xl px-4 py-2 bg-brand-800 text-white hover:bg-brand-700">Salvar reagendamento</button>
      <button id="r_cancel" class="w-full rounded-xl px-4 py-2 border hover:bg-brand-50">Cancelar</button>
    </div>
  </div>`;

  root.appendChild(wrap);

  const selDoc = wrap.querySelector('#r_doctor');
  const inpDate = wrap.querySelector('#r_date');
  const selTime = wrap.querySelector('#r_time');
  const eDoc = wrap.querySelector('#err_doc');
  const eDt = wrap.querySelector('#err_dt');
  const eLogic = wrap.querySelector('#err_logic');

  // 🔹 Bloquear datas passadas também no reagendamento
  {
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const minStr = `${todayOnly.getFullYear()}-${pad2(todayOnly.getMonth()+1)}-${pad2(todayOnly.getDate())}`;
    inpDate.min = minStr;
  }

  async function refreshRescheduleTimes(){
    const docId = selDoc.value;
    const dStr = inpDate.value;
    if(!docId || !dStr){
      selTime.innerHTML = `<option value="">Selecione a data e o médico</option>`;
      return;
    }
    const day = parseYMD(dStr);
    if(!isClinicOpenDay(day)){
      selTime.innerHTML = `<option value="">Clínica fechada nesse dia</option>`;
      return;
    }
    let slots = allDaySlots(day);
    const blocked = await blockedSlotsForDoctor(docId, day);
    slots = slots.filter(hm => !blocked.has(hm));
    slots = filterByLeadTime(slots, day);

    if(!slots.length){
      selTime.innerHTML = `<option value="">Sem horários disponíveis</option>`;
      return;
    }
    selTime.innerHTML = [`<option value="">Selecione...</option>`, ...slots.map(h=>`<option value="${h}">${h}</option>`)].join('');
    if (isSameDay(new Date(a.datetime), day)) {
      const hOrig = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
      if (slots.includes(hOrig)) selTime.value = hOrig;
    }
  }

  // 🔹 Validação da data no reagendamento (sem domingo, sem passado)
  function handleRescheduleDateChange(){
    eDt.classList.add('hidden');
    eDt.textContent = 'Informe uma data e hora válidas (seg–sáb, 07:00–19:00; início até 18:00; 30 min de antecedência).';

    const value = inpDate.value;
    if (!value){
      selTime.innerHTML = `<option value="">Selecione a data e o médico</option>`;
      return;
    }

    const d = parseYMD(value);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (d < todayOnly){
      inpDate.value = '';
      selTime.innerHTML = `<option value="">Selecione a data e o médico</option>`;
      eDt.textContent = 'Não é possível reagendar para datas passadas.';
      eDt.classList.remove('hidden');
      return;
    }

    if (d.getDay() === 0){
      inpDate.value = '';
      selTime.innerHTML = `<option value="">Selecione a data e o médico</option>`;
      eDt.textContent = 'Não é possível reagendar aos domingos.';
      eDt.classList.remove('hidden');
      return;
    }

    refreshRescheduleTimes();
  }

  (async () => {
    await refreshRescheduleTimes();
  })();

  selDoc.addEventListener('change', async () => {
    await refreshRescheduleTimes();
  });
  inpDate.addEventListener('change', handleRescheduleDateChange);

  const closeModal=()=>{document.documentElement.classList.remove('overflow-hidden');document.body.classList.remove('overflow-hidden');wrap.remove();};
  wrap.querySelector('#r_cancel').onclick=closeModal;

  wrap.querySelector('#r_save').onclick = async () => {
    eDoc.classList.add('hidden'); eDt.classList.add('hidden'); eLogic.classList.add('hidden'); eLogic.textContent='';

    eDoc.classList.add('hidden'); eDt.classList.add('hidden'); eLogic.classList.add('hidden'); eLogic.textContent='';

    const doc = doctorsAll.find(d=>String(d.id)===String(selDoc.value));
    if(!doc || !doc.active || doc.specialty!==espec){ eDoc.classList.remove('hidden'); return; }

    const dateStr = inpDate.value;
    const timeStr = selTime.value;
    if(!dateStr || !timeStr){ eDt.classList.remove('hidden'); return; }

    const [H,M]=timeStr.split(':').map(Number);
    const start = parseYMD(dateStr); start.setHours(H,M,0,0);
    if(!isClinicOpenDay(start)||!isClinicOpenHour(start)||!isAtLeast30MinAhead(start)){
      eDt.classList.remove('hidden'); return;
    }

    try {
      await api.updateConsulta(a.id, {
        data: dateStr,
        hora: timeStr + ':00'
      });
      closeModal();
      showAlert(alertArea, `Consulta reagendada para ${fmtDateTime(start)}.`);
      render(1);
    } catch (error) {
      eLogic.textContent = error.message;
      eLogic.classList.remove('hidden');
    }
  };
}
