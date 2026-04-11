export function showAlert(target, message, type='success'){
  const div=document.createElement('div');
  div.className=`alert fade-in ${type==='success'?'alert-success': type==='error'?'alert-error':'alert-info'}`;
  div.textContent=message; target.innerHTML=''; target.appendChild(div); setTimeout(()=>div.remove(),4000);
}
export function confirmModal({title='Confirmação', message='Tem certeza?', confirmText='Confirmar', cancelText='Cancelar'}){
  return new Promise(resolve=>{
    const root=document.getElementById('modalRoot'); const wrap=document.createElement('div'); wrap.className='modal-backdrop';
    wrap.innerHTML=`<div class="modal-card"><div class="p-5 border-b"><h3 class="text-lg font-semibold text-brand-900">${title}</h3></div>
    <div class="p-5 text-brand-800">${message}</div>
    <div class="p-5 border-t flex justify-end gap-2">
      <button id="mCancel" class="px-4 py-2 rounded-lg border hover:bg-brand-50">${cancelText}</button>
      <button id="mOk" class="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">${confirmText}</button>
    </div></div>`;
    root.appendChild(wrap);
    wrap.querySelector('#mCancel').onclick=()=>{wrap.remove(); resolve(false);};
    wrap.querySelector('#mOk').onclick=()=>{wrap.remove(); resolve(true);};
  });
}
export function promptModal({title='Preencha', fields=[], confirmText='Salvar', cancelText='Cancelar', initial={}}){
  return new Promise(resolve=>{
    const root=document.getElementById('modalRoot'); const wrap=document.createElement('div'); wrap.className='modal-backdrop';
    const inputs=fields.map(f=>{ const val=initial[f.name]??''; const disabled=f.disabled?'disabled':''; const required=f.required?'required':''; const type=f.type||'text';
      if(f.type==='select'){ const opts=f.options.map(o=>`<option ${o===val?'selected':''}>${o}</option>`).join('');
        return `<label class="grid gap-1">
          <span class="text-sm text-brand-800">${f.label}</span>
          <select name="${f.name}" class="border rounded-lg px-3 py-2" ${disabled} ${required}>${opts}</select>
        </label>`;
      }
      return `<label class="grid gap-1"><span class="text-sm text-brand-800">${f.label}</span><input name="${f.name}" type="${type}" value="${val}" class="border rounded-lg px-3 py-2" ${disabled} ${required} /></label>`;
    }).join('');
    wrap.innerHTML=`<div class="modal-card">
      <div class="p-5 border-b"><h3 class="text-lg font-semibold text-brand-900">${title}</h3></div>
      <form class="p-5 grid gap-3">${inputs}</form>
      <div class="p-5 border-t flex justify-end gap-2">
        <button id="mCancel" class="px-4 py-2 rounded-lg border hover:bg-brand-50" type="button">${cancelText}</button>
        <button id="mOk" class="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700" type="submit">${confirmText}</button>
      </div>
    </div>`;
    root.appendChild(wrap);
    const form=wrap.querySelector('form');
    wrap.querySelector('#mCancel').onclick=()=>{wrap.remove(); resolve(null);};
    wrap.querySelector('#mOk').onclick=(e)=>{e.preventDefault(); const data=Object.fromEntries(new FormData(form).entries()); wrap.remove(); resolve(data);};
  });
}
export function paginate(data,page=1,per=10){ const total=data.length; const pages=Math.max(1,Math.ceil(total/per)); const start=(page-1)*per; return {items:data.slice(start,start+per),page,pages,total}; }
export function renderPager(el,state,onPage){
  el.innerHTML=''; const info=document.createElement('div'); info.className='text-sm text-brand-700'; info.textContent=`Total: ${state.total} • Página ${state.page} de ${state.pages}`;
  const ctrls=document.createElement('div'); ctrls.className='flex gap-2';
  const btn=(label,disabled,page)=>{ const b=document.createElement('button'); b.textContent=label; b.disabled=disabled; b.className='px-3 py-1 rounded border hover:bg-brand-50 disabled:opacity-50'; b.onclick=()=>onPage(page); return b; };
  const wrap=document.createElement('div'); wrap.className='flex items-center justify-between w-full'; wrap.append(info,ctrls); el.appendChild(wrap);
  ctrls.append(btn('«',state.page===1,1), btn('‹',state.page===1,state.page-1), btn('›',state.page===state.pages,state.page+1), btn('»',state.page===state.pages,state.pages));
}
export function guardUnsaved(onBefore){
  let dirty=false; const setDirty=(v=true)=>{dirty=v;};
  window.addEventListener('beforeunload',(e)=>{ if(dirty){ e.preventDefault(); e.returnValue=''; } });
  return { mark:()=>setDirty(true), clear:()=>setDirty(false), async confirmDiscard(){ if(!dirty) return true; const ok=await confirmModal({title:'Descartar alterações?', message:'Existem alterações não salvas. Deseja descartá-las?'}); if(ok){ setDirty(false); onBefore?.(); } return ok; } };
}
