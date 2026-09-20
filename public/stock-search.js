(() => {
  const input = document.getElementById('symbol');
  if (!input || !Array.isArray(window.StockSamjhoUniverse)) return;

  const universe = window.StockSamjhoUniverse;
  const recentKey = 'stocksamjho.recentSearches.v1';
  const row = input.parentElement;
  row.style.position = 'relative';

  const style = document.createElement('style');
  style.textContent = `
    .stock-search-box{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:50;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 14px 30px rgba(20,35,55,.14);overflow:hidden;display:none}
    .stock-search-box.show{display:block}
    .stock-search-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:0;border-bottom:1px solid #edf0f4;background:#fff;text-align:left}
    .stock-search-item:last-child{border-bottom:0}.stock-search-item:hover,.stock-search-item.active{background:#f7f9fc}
    .stock-search-name{font-weight:750;color:var(--ink);font-size:12px}.stock-search-meta{font:10px var(--mono);color:var(--muted);white-space:nowrap}
    .stock-search-empty{padding:12px;color:var(--muted);font-size:11px}.stock-search-recent{font:700 9px var(--mono);letter-spacing:.6px;color:var(--muted);padding:8px 12px 5px;text-transform:uppercase}
  `;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'stock-search-box';
  box.setAttribute('role','listbox');
  box.setAttribute('aria-label','Stock suggestions');
  row.appendChild(box);

  let active = -1;

  function recent(){
    try{
      const v=JSON.parse(localStorage.getItem(recentKey)||'[]');
      return Array.isArray(v)?v.filter(x=>x&&typeof x.symbol==='string').slice(0,5):[];
    }catch{return []}
  }
  function remember(item){
    try{
      const next=[item,...recent().filter(x=>x.symbol!==item.symbol)].slice(0,5);
      localStorage.setItem(recentKey,JSON.stringify(next));
    }catch{}
  }
  function matches(q){
    const needle=q.trim().toLowerCase();
    if(!needle)return recent();
    return universe.filter(x=>{
      const symbol=x.symbol.toLowerCase(), name=x.name.toLowerCase();
      return symbol.includes(needle)||name.includes(needle);
    }).sort((a,b)=>{
      const aExact=a.symbol.toLowerCase()===needle?0:a.name.toLowerCase()===needle?1:2;
      const bExact=b.symbol.toLowerCase()===needle?0:b.name.toLowerCase()===needle?1:2;
      return aExact-bExact||a.name.localeCompare(b.name);
    }).slice(0,8);
  }
  function render(q){
    const list=matches(q); active=-1;
    if(!q.trim() && !list.length){box.innerHTML='<div class="stock-search-empty">Start typing a company name or symbol.</div>';box.classList.add('show');return;}
    if(!list.length){box.innerHTML='<div class="stock-search-empty">No matching company or stock found.</div>';box.classList.add('show');return;}
    const recentLabel=!q.trim()?'<div class="stock-search-recent">Recent searches</div>':'';
    box.innerHTML=recentLabel+list.map((x,i)=>`<button type="button" class="stock-search-item" data-index="${i}" data-symbol="${x.symbol}"><span class="stock-search-name">${escapeHtml(x.name)}</span><span class="stock-search-meta">${escapeHtml(x.symbol)} · ${escapeHtml(x.exchange)}</span></button>`).join('');
    box.classList.add('show');
    box.querySelectorAll('.stock-search-item').forEach(btn=>btn.addEventListener('click',()=>{
      const item=list[Number(btn.dataset.index)];
      if(!item)return;
      input.value=item.symbol;
      remember(item);
      close();
      input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    }));
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function close(){box.classList.remove('show');active=-1;}
  function setActive(index){
    const items=[...box.querySelectorAll('.stock-search-item')];
    if(!items.length){active=-1;return;}
    active=(index+items.length)%items.length;
    items.forEach((x,i)=>x.classList.toggle('active',i===active));
    items[active].scrollIntoView({block:'nearest'});
  }

  input.placeholder='Search company or stock';
  input.setAttribute('aria-label','Search company or stock');
  input.setAttribute('autocomplete','off');
  input.addEventListener('input',()=>render(input.value));
  input.addEventListener('focus',()=>{if(!input.value.trim())render('');else render(input.value);});
  input.addEventListener('keydown',event=>{
    if(!box.classList.contains('show'))return;
    if(event.key==='ArrowDown'){event.preventDefault();setActive(active+1);}
    else if(event.key==='ArrowUp'){event.preventDefault();setActive(active-1);}
    else if(event.key==='Escape'){event.preventDefault();close();}
    else if(event.key==='Enter' && active>=0){
      event.preventDefault();
      box.querySelectorAll('.stock-search-item')[active]?.click();
    }
  });
  document.addEventListener('click',event=>{if(!row.contains(event.target))close();});
})();