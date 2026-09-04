(() => {
  const universe = [
    ['RELIANCE','Reliance Industries'],['TCS','Tata Consultancy Services'],['HDFCBANK','HDFC Bank'],
    ['ICICIBANK','ICICI Bank'],['INFY','Infosys'],['ITC','ITC'],['LT','Larsen & Toubro'],
    ['BHARTIARTL','Bharti Airtel'],['AXISBANK','Axis Bank'],['MARUTI','Maruti Suzuki'],
    ['SUNPHARMA','Sun Pharma'],['M&M','Mahindra & Mahindra'],['TITAN','Titan Company'],
    ['BAJFINANCE','Bajaj Finance'],['KOTAKBANK','Kotak Mahindra Bank'],['ASIANPAINT','Asian Paints'],
    ['TRENT','Trent'],['HAL','HAL'],['BEL','Bharat Electronics'],['POLYCAB','Polycab'],
    ['HAVELLS','Havells'],['PIDILITIND','Pidilite'],['DIXON','Dixon Technologies'],['POWERGRID','Power Grid'],
    ['NTPC','NTPC'],['COALINDIA','Coal India'],['TATASTEEL','Tata Steel'],['JSWSTEEL','JSW Steel'],
    ['HCLTECH','HCLTech'],['TECHM','Tech Mahindra'],['PERSISTENT','Persistent Systems'],['DRREDDY','Dr Reddy’s Labs'],
    ['CIPLA','Cipla'],['APOLLOHOSP','Apollo Hospitals']
  ];

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-IN',{maximumFractionDigits:2}) : '—';

  function injectStyles(){
    if($('autoModeStyles')) return;
    const s=document.createElement('style'); s.id='autoModeStyles';
    s.textContent=`
      .stockSuggest{position:absolute;left:0;right:0;top:calc(100% + 5px);z-index:9999;background:#0f1a2b;border:1px solid #26405e;border-radius:10px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.4);display:none}
      .stockSuggest.show{display:block}.stockSuggest div{padding:10px 12px;display:flex;justify-content:space-between;gap:12px;cursor:pointer;border-bottom:1px solid #1a2b42}
      .stockSuggest div:hover{background:#132941}.stockSuggest b{font-family:monospace;color:#00e5ff}.stockSuggest span{color:#a6b4c7;font-size:12px}
      .scanHeader{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}.scanBtn{margin-left:auto}
      .scanGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.scanMini{font-size:11px;color:#8ea0b8;font-family:monospace}.scanMini b{color:#e8f1ff}
      @media(max-width:700px){.scanGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.scanBtn{margin-left:0}}
    `; document.head.appendChild(s);
  }

  function setupAutocomplete(){
    const input=$('symbol'); if(!input || input.dataset.autocompleteReady) return; input.dataset.autocompleteReady='1';
    const row=input.parentElement; row.style.position='relative';
    const box=document.createElement('div'); box.className='stockSuggest'; row.appendChild(box);
    const render=q=>{
      q=q.trim().toLowerCase(); if(!q){box.classList.remove('show');return;}
      const m=universe.filter(([sym,name])=>sym.toLowerCase().includes(q)||name.toLowerCase().includes(q)).slice(0,8);
      box.innerHTML=m.map(([sym,name])=>`<div data-sym="${esc(sym)}"><b>${esc(sym)}</b><span>${esc(name)}</span></div>`).join('');
      if(m.length) box.classList.add('show'); else box.classList.remove('show');
      box.querySelectorAll('div').forEach(el=>el.addEventListener('click',()=>{input.value=el.dataset.sym;box.classList.remove('show');}));
    };
    input.addEventListener('input',()=>render(input.value)); input.addEventListener('focus',()=>render(input.value));
    document.addEventListener('click',e=>{if(!row.contains(e.target))box.classList.remove('show');});
  }

  async function health(){
    const el=$('liveStatus'); if(!el)return;
    try{const r=await fetch('/api/health',{cache:'no-store'}); if(!r.ok)throw new Error(); const d=await r.json();
      el.textContent=`● LIVE BACKEND • CONNECTED • ${d.provider||'market data ready'}`; el.className='liveStatus live';
    }catch{el.textContent='● BACKEND UNAVAILABLE • Vercel API is not reachable'; el.className='liveStatus err';}
  }

  function scoreRow(x){
    const setup=x.setup||{};
    return {
      ...x,
      score:Number.isFinite(Number(x.strategyScore))?Number(x.strategyScore):(Number.isFinite(Number(x.score))?Number(x.score):null),
      decision:setup.action||x.action||'WAIT',
      momentumPct:x.technical?.momentum5d??x.momentumPct??null,
      sma20:x.technical?.e20??x.sma20??null,
      trend:x.technical?.trend??x.trend??'MIXED',
    };
  }

  const scanResults=payload=>Array.isArray(payload?.results)?payload.results:Array.isArray(payload?.data)?payload.data:Array.isArray(payload)?payload:[];

  async function swingScan(){
    const body=$('swingBody'); if(!body)return;
    body.innerHTML='<div class="sub">Scanning liquid NSE stocks… verified daily market data + technical evidence.</div>';
    try{
      const r=await fetch('/api/scan?deep=false',{cache:'no-store'});
      if(!r.ok) throw new Error(await r.text());
      const payload=await r.json(); const list=scanResults(payload).map(scoreRow).sort((a,b)=>(b.score??-1)-(a.score??-1));
      body.innerHTML=`<div class="scanHeader"><div><h3 style="margin:0">Today's Swing Candidates</h3><div class="sub">Verified provider-backed market data. No setup can be the correct decision.</div></div><button class="smallBtn scanBtn" id="rescanSwing">RESCAN</button></div>`+
      (list.length?list.map((x,i)=>`<div class="panel" style="margin-bottom:10px;padding:13px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>#${i+1} ${esc(x.symbol||'')}</b><span class="badge bcyan">${esc(x.decision)}</span><span class="sub">Score ${x.score??'—'}/100</span></div><div class="scanGrid"><div class="scanMini">PRICE<br><b>₹${fmt(x.price)}</b></div><div class="scanMini">5D MOMENTUM<br><b>${fmt(x.momentumPct)}%</b></div><div class="scanMini">EMA20<br><b>₹${fmt(x.sma20)}</b></div><div class="scanMini">TREND<br><b>${esc(x.trend)}</b></div></div></div>`).join(''):'<div class="alert amber">NO TRADE TODAY — no sufficiently strong technical setup passed the scan.</div>');
      $('rescanSwing')?.addEventListener('click',swingScan);
    }catch(e){body.innerHTML=`<div class="alert amber"><b>Swing scan unavailable.</b><br>${esc(e.message||'Backend unavailable')}</div>`;}
  }

  async function radarScan(){
    const msg=$('radarMsg'); if(!msg)return;
    msg.textContent='Auto radar scanning…';
    try{
      const r=await fetch('/api/scan?deep=false',{cache:'no-store'});
      if(!r.ok)throw new Error(await r.text());
      const payload=await r.json(); const list=scanResults(payload).map(scoreRow).sort((a,b)=>(b.score??-1)-(a.score??-1));
      $('radarTable').innerHTML=list.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.symbol||'')}</b></td><td class="cyan">${x.score??'—'}</td><td>—</td><td>—</td><td>${x.risk??'—'}</td><td>${esc(x.trend||'—')}</td><td><span class="signal ${x.decision.includes('BUY')?'buy':x.decision.includes('AVOID')?'sell':'wait'}">${esc(x.decision)}</span></td></tr>`).join('');
      msg.textContent=`${list.length} stocks ranked • ${new Date().toLocaleTimeString('en-IN')}`;
    }catch(e){msg.textContent='Radar unavailable: '+(e.message||'backend error');}
  }

  function setup(){
    injectStyles(); setupAutocomplete(); health();
    const swing=$('swingAutoToggle'); if(swing) swing.addEventListener('click',()=>{const on=$('swingDot')?.classList.contains('on'); if(!on){$('swingDot')?.classList.add('on'); swingScan();}else{$('swingDot')?.classList.remove('on');}});
    const radar=$('radarAutoToggle'); if(radar) radar.addEventListener('click',()=>{const on=$('radarDot')?.classList.contains('on'); if(!on){$('radarDot')?.classList.add('on'); radarScan();}else{$('radarDot')?.classList.remove('on');}});
    const rr=$('radarRun'); if(rr) rr.addEventListener('click',radarScan);
    window.addEventListener('focus',health);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup); else setup();
})();
