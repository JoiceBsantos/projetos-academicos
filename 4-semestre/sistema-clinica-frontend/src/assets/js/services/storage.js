const KEYS = { DOCTORS:'vollmed_doctors', PATIENTS:'vollmed_patients', APPTS:'vollmed_appointments', SESSION:'vollmed_session', USERS:'vollmed_users' };
function load(k){ return JSON.parse(localStorage.getItem(k) || '[]'); }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function uid(p){ return `${p}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`; }

export const Session = {
  login(email, password){ 
    // admin padrão
    if(email === 'adm@vollmed.com' && password === '123456'){ 
      localStorage.setItem(KEYS.SESSION, JSON.stringify({email, loggedAt:Date.now(), isAdmin: true})); 
      return true; 
    }
    
    // usuários cadastrados
    const users = load(KEYS.USERS);
    const user = users.find(u => u.email === email && u.password === password);
    if(user){
      localStorage.setItem(KEYS.SESSION, JSON.stringify({email, loggedAt:Date.now(), isAdmin: false})); 
      return true;
    }
    
    return false; 
  },
  logout(){ localStorage.removeItem(KEYS.SESSION); },
  current(){ return JSON.parse(localStorage.getItem(KEYS.SESSION) || 'null'); },
  registerUser(email, password){
    const users = load(KEYS.USERS);
    const exists = users.find(u => u.email === email);
    if(exists) throw new Error('Usuário já existe');
    
    users.push({ email, password, createdAt: new Date().toISOString() });
    save(KEYS.USERS, users);
    return true;
  }
};

export const Doctors = {
  list(){ return load(KEYS.DOCTORS); },
  create(data){ const now=new Date().toISOString(); const rec={id:uid('doc'),active:true,createdAt:now,updatedAt:now,...data}; const arr=load(KEYS.DOCTORS); arr.push(rec); save(KEYS.DOCTORS,arr); return rec; },
  update(id,patch){ const arr=load(KEYS.DOCTORS); const i=arr.findIndex(d=>d.id===id); if(i===-1) throw new Error('Médico não encontrado'); arr[i]={...arr[i],...patch,updatedAt:new Date().toISOString()}; save(KEYS.DOCTORS,arr); return arr[i]; },
  deactivate(id){ const appts=load(KEYS.APPTS).filter(a=>a.doctorId===id && a.status==='agendada'); if(appts.length) throw new Error('Não é possível desativar: existem consultas agendadas.'); return this.update(id,{active:false}); }
};

export const Patients = {
  list(){ return load(KEYS.PATIENTS); },
  create(data){ const now=new Date().toISOString(); const rec={id:uid('pat'),active:true,createdAt:now,updatedAt:now,...data}; const arr=load(KEYS.PATIENTS); arr.push(rec); save(KEYS.PATIENTS,arr); return rec; },
  update(id,patch){ const arr=load(KEYS.PATIENTS); const i=arr.findIndex(d=>d.id===id); if(i===-1) throw new Error('Paciente não encontrado'); arr[i]={...arr[i],...patch,updatedAt:new Date().toISOString()}; save(KEYS.PATIENTS,arr); return arr[i]; },
  deactivate(id){ return this.update(id,{active:false}); }
};

export const Appointments = {
  list(){ return load(KEYS.APPTS); },
  create(data){ const now=new Date().toISOString(); const rec={id:uid('apt'),status:'agendada',createdAt:now,updatedAt:now,...data}; const arr=load(KEYS.APPTS); arr.push(rec); save(KEYS.APPTS,arr); return rec; },
  update(id,patch){ const arr=load(KEYS.APPTS); const i=arr.findIndex(d=>d.id===id); if(i===-1) throw new Error('Consulta não encontrada'); arr[i]={...arr[i],...patch,updatedAt:new Date().toISOString()}; save(KEYS.APPTS,arr); return arr[i]; }
};
