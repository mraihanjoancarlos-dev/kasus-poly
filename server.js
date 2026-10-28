const express=require('express'),http=require('http'),path=require('path'),fs=require('fs'),{Server}=require('socket.io');
const {B,G,K,R:RC,CFG}=require('./board');
const app=express(),srv=http.createServer(app),io=new Server(srv,{cors:{origin:'*'}});

// index.html boleh di folder /public ATAU sejajar dengan server.js (file lain tidak ikut terbuka)
const pub=path.join(__dirname,'public');
app.use(express.static(pub));
app.get('/',(q,s)=>{const f=path.join(pub,'index.html');s.sendFile(fs.existsSync(f)?f:path.join(__dirname,'index.html'))});
app.get('/health',(q,s)=>s.send('ok'));

const rooms={},timers={},COL=['#ff5252','#40c4ff','#ffd740','#69f0ae'];
const d6=()=>1+Math.floor(Math.random()*6),rd=x=>Math.round(x*10)/10;
const grp=g=>B.map((t,i)=>t.g===g?i:-1).filter(i=>i>=0);
const price=(r,i)=>rd(B[i].p*r.k);              // harga naik tiap putaran
const cur=r=>r.pl[r.turn],who=(r,id)=>r.pl.find(q=>q.id===id);
const log=(r,m)=>{r.log.push(m);r.ln++;if(r.log.length>40)r.log.shift()};
const fx=(r,n)=>io.to(r.code).emit('fx',n);
const view=r=>({code:r.code,host:r.host,ph:r.ph,turn:r.turn,round:r.round,sal:r.sal,k:r.k,own:r.own,lv:r.lv,log:r.log,ln:r.ln,win:r.win,due:r.due,
 pl:r.pl.map(({sid,...p})=>p),pr:B.map((t,i)=>t.p?price(r,i):0),
 cfg:{min:CFG.MIN,max:CFG.MAX,bail:CFG.BAIL,ott:CFG.OTT,sogok:CFG.SOGOK}});
const push=r=>{r.t=Date.now();io.to(r.code).emit('state',view(r))};
const clean=n=>String(n||'').replace(/[<>&"'`\\]/g,'').trim().slice(0,12)||'Pemain';

function rent(r,i,o){const t=B[i];
 if(t.t==='r')return rd(2*r.k*Object.keys(r.own).filter(k=>r.own[k]===o&&B[k].t==='r').length);
 const L=r.lv[i]||0;let a=price(r,i)/10*[1,5,15,35,55,80][L];
 if(!L&&grp(t.g).every(k=>r.own[k]===o))a*=2;return rd(a)}
// bangkrut: kalau ada kreditur, semua properti pindah ke kreditur (bangunan dirobohkan); kalau tidak, kembali ke bank
function out(r,p,to){p.out=1;p.m=0;let n=0;Object.keys(r.own).forEach(k=>{if(r.own[k]===p.id){if(to&&!to.out){r.own[k]=to.id;n++}else delete r.own[k];delete r.lv[k]}});
 log(r,`💥 ${p.name} bangkrut!${n?` ${n} properti disita ${to.name}`:''}`);
 const a=r.pl.filter(q=>!q.out);
 if(a.length===1){r.ph='over';r.win=a[0].name;r.due=null;log(r,`🏆 ${a[0].name} bertahan sampai akhir!`);fx(r,'win')}}
// kreditur hanya menerima uang yang benar-benar dimiliki pembayar (tidak ada uang "muncul" dari utang)
function pay(r,p,a,to){a=rd(a);const had=Math.max(0,p.m);p.m=rd(p.m-a);if(to)to.m=rd(to.m+(p.m<0?had:a));if(p.m<0)out(r,p,to)}
function next(r){if(r.ph==='over')return;const prev=r.turn;
 do r.turn=(r.turn+1)%r.pl.length;while(cur(r).out);
 if(r.turn<=prev){r.round++;r.sal=rd(r.sal*1.02);const up=.02+Math.random()*.01;r.k*=1+up;
  log(r,`📈 Putaran ${r.round}: gaji naik 2% (Rp${r.sal}jt), harga naik ${(up*100).toFixed(1)}%`)}
 r.ph='roll';r.due=null}
function jail(r,p){p.pos=10;p.j=CFG.JAIL;p.tp++;r.ph='end';r.due=null;log(r,`🚔 ${p.name} masuk LAPAS`);fx(r,'ott')}
function land(r,p){const t=B[p.pos];r.ph='end';
 if(t.t==='p'||t.t==='r'){const o=r.own[p.pos];
  if(o===undefined)r.ph='buy';
  else if(o!==p.id){const a=rent(r,p.pos,o);r.due={a,to:o};r.ph='rent';log(r,`🏠 ${p.name} mampir ke ${t.n} milik ${who(r,o).name}, sewa Rp${a}jt`)}}
 else if(t.t==='x'){const a=price(r,p.pos);log(r,`🧾 ${p.name} setor upeti Rp${a}jt (${t.n})`);fx(r,'coin');pay(r,p,a)}
 else if(t.t==='g'){log(r,`🚨 OTT! ${p.name} digelandang ke LAPAS`);jail(r,p)}
 else if(t.t==='f')log(r,`✈️ ${p.name} studi banding ke luar negeri, gratis!`);
 else if(t.t==='c'||t.t==='k'){const L=t.t==='c'?K:RC,c=L[Math.floor(Math.random()*L.length)];
  log(r,`${t.t==='c'?'🎴':'⚠️'} ${p.name}: ${c[0]}`);fx(r,'card');io.to(r.code).emit('cardshow',{k:t.t,t:c[0],n:p.name,id:p.id});
  if(c[1]==='m'){if(c[2]>0)p.m=rd(p.m+c[2]);else pay(r,p,-c[2])}
  else if(c[1]==='j')jail(r,p);
  else{p.m=rd(p.m+r.sal);p.pos=0;p.tp++}}}

io.on('connection',s=>{
 let r=null,pid=null;
 const mine=()=>r&&r.ph!=='lobby'&&r.ph!=='over'&&cur(r).id===pid;
 s.emit('board',{B,G});

 const join=(code,name,id)=>{
  id=String(id||'').slice(0,40);if(id.length<8)return s.emit('err','ID pemain tidak valid');
  const x=rooms[code];if(!x)return s.emit('gone');
  let p=who(x,id);
  if(p){if(p.off)log(x,`📶 ${p.name} kembali`);p.off=0;p.sid=s.id;clearTimeout(timers[code+id])}
  else{
   if(x.ph!=='lobby')return s.emit('err','Permainan sudah dimulai');
   if(x.pl.length>=CFG.MAX)return s.emit('err','Ruangan penuh (maks '+CFG.MAX+' pemain)');
   p={id,sid:s.id,name:clean(name),c:COL.find(c=>!x.pl.some(q=>q.c===c)),pos:0,m:CFG.START,j:0,out:0,off:0,tp:0};
   x.pl.push(p);log(x,`👋 ${p.name} bergabung`)}
  if(r&&r!==x)s.leave(r.code);
  r=x;pid=id;s.join(code);s.emit('joined',code);push(r)};

 s.on('create',(n,id)=>{let c;do c=Math.random().toString(36).slice(2,6).toUpperCase();while(rooms[c]||c.length<4);
  rooms[c]={code:c,pl:[],own:{},lv:{},turn:0,ph:'lobby',log:[],ln:0,host:String(id||'').slice(0,40),round:1,sal:CFG.SALARY,k:1,due:null,win:null,t:Date.now()};
  join(c,n,id)});
 s.on('join',(c,n,id)=>join(String(c).trim().toUpperCase(),n,id));
 s.on('start',()=>{if(r&&r.host===pid&&r.ph==='lobby'&&r.pl.length>=CFG.MIN){r.ph='roll';log(r,'🎲 Permainan dimulai! Bertahanlah di negeri Konoha');push(r)}});
 s.on('again',()=>{if(!r||r.host!==pid||r.ph!=='over')return;
  r.pl=r.pl.filter(p=>!p.off);r.pl.forEach(p=>Object.assign(p,{pos:0,m:CFG.START,j:0,out:0,tp:p.tp+1}));
  Object.assign(r,{own:{},lv:{},turn:0,ph:'lobby',win:null,due:null,round:1,sal:CFG.SALARY,k:1});log(r,'🔁 Ruangan siap main lagi');push(r)});

 s.on('roll',()=>{if(!mine()||r.ph!=='roll')return;const p=cur(r),a=d6(),b=d6();
  io.to(r.code).emit('dice',[a,b]);log(r,`🎲 ${p.name} melempar ${a}+${b}`);
  if(p.j>0){
   if(a===b){p.j=0;log(r,`🔓 ${p.name} lolos dari LAPAS (dadu kembar)`)}
   else{p.j--;log(r,`⛓️ ${p.name} masih di LAPAS`);
    if(p.j===0){log(r,`💸 ${p.name} bebas, bayar denda Rp${CFG.FINE}jt`);pay(r,p,CFG.FINE)}
    next(r);return push(r)}}
  const n=(p.pos+a+b)%40;
  if(n<p.pos){p.m=rd(p.m+r.sal);log(r,`💰 ${p.name} lewat GAJIAN +Rp${r.sal}jt`);fx(r,'coin')}
  p.pos=n;log(r,`📍 ${p.name} tiba di ${B[n].n}`);land(r,p);if(p.out)next(r);push(r)});

 s.on('bail',()=>{if(!mine()||r.ph!=='roll')return;const p=cur(r);
  if(p.j<1||p.m<CFG.BAIL)return;pay(r,p,CFG.BAIL);p.j=0;log(r,`🤫 ${p.name} menyogok sipir Rp${CFG.BAIL}jt dan keluar LAPAS`);fx(r,'coin');push(r)});

 s.on('buy',()=>{if(!mine()||r.ph!=='buy')return;const p=cur(r),t=B[p.pos],c=price(r,p.pos);
  if(p.m<c)return s.emit('err','Uang tidak cukup!');
  p.m=rd(p.m-c);r.own[p.pos]=p.id;log(r,`🏷️ ${p.name} membeli ${t.n} (Rp${c}jt)`);r.ph='end';fx(r,'buy');push(r)});
 s.on('pass',()=>{if(mine()&&r.ph==='buy'){r.ph='end';push(r)}});

 s.on('pay',()=>{if(!mine()||r.ph!=='rent')return;const p=cur(r),o=who(r,r.due.to);
  log(r,`💸 ${p.name} bayar Rp${r.due.a}jt ke ${o.name}`);fx(r,'coin');r.ph='end';const a=r.due.a;r.due=null;pay(r,p,a,o);if(p.out)next(r);push(r)});

 // sogok petugas: bayar 40% sewa ke "oknum". Peluang kena OTT: bayar sewa penuh + masuk LAPAS
 s.on('sogok',()=>{if(!mine()||r.ph!=='rent')return;const p=cur(r),o=who(r,r.due.to),a=r.due.a,fee=rd(a*CFG.SOGOK);
  pay(r,p,fee);r.due=null;if(p.out){next(r);return push(r)}
  if(Math.random()<CFG.OTT){log(r,`🚨 Sogok ketahuan! ${p.name} kena OTT, bayar sewa Rp${a}jt`);pay(r,p,a,o);
   if(p.out){next(r);return push(r)}jail(r,p)}
  else{log(r,`🤫 ${p.name} menyogok Rp${fee}jt, sewa Rp${a}jt dimaafkan`);r.ph='end';fx(r,'coin')}
  push(r)});

 s.on('end',()=>{if(mine()&&r.ph==='end'){next(r);push(r)}});
 s.on('build',i=>{i=+i;if(!mine()||!Number.isInteger(i)||!['roll','end'].includes(r.ph))return;
  const p=cur(r),t=B[i];if(!t||t.t!=='p'||r.own[i]!==p.id)return;
  const g=grp(t.g);if(!g.every(k=>r.own[k]===p.id))return;
  const L=r.lv[i]||0,c=rd(price(r,i)/2);
  if(L>4||p.m<c||g.some(k=>(r.lv[k]||0)<L))return;
  p.m=rd(p.m-c);r.lv[i]=L+1;log(r,`🏗️ ${p.name} membangun di ${t.n} (level ${L+1})`);fx(r,'buy');push(r)});

 // terputus (mis. pindah aplikasi di HP): beri waktu untuk masuk lagi sebelum dianggap keluar
 s.on('disconnect',()=>{if(!r||!pid)return;const x=r,id=pid,p=who(x,id);if(!p||p.sid!==s.id)return;
  p.off=1;push(x);
  timers[x.code+id]=setTimeout(()=>{delete timers[x.code+id];if(!rooms[x.code]||!p.off)return;
   if(x.ph==='lobby'){x.pl=x.pl.filter(q=>q!==p);if(x.host===id&&x.pl[0])x.host=x.pl[0].id;
    if(!x.pl.length){delete rooms[x.code];return}log(x,`👋 ${p.name} keluar`)}
   else if(x.ph!=='over'&&!p.out){const was=cur(x)===p;log(x,`📴 ${p.name} terputus terlalu lama`);out(x,p);if(was)next(x)}
   if(x.host===id){const h=x.pl.find(q=>!q.off&&q!==p)||x.pl.find(q=>!q.off);if(h)x.host=h.id}  // host baru supaya tombol "Main Lagi" tetap ada yang pegang
   push(x)},x.ph==='lobby'?20000:60000)});
});

setInterval(()=>{const now=Date.now();Object.keys(rooms).forEach(c=>{const x=rooms[c];
 if(now-x.t>600000&&x.pl.every(p=>p.off))delete rooms[c]})},300000);
srv.listen(process.env.PORT||3000,()=>console.log('KasusPoly jalan di port',process.env.PORT||3000));