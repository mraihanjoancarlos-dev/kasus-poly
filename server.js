const express=require('express'),http=require('http'),{Server}=require('socket.io'),{B,G,K,R:RC}=require('./board');
const app=express(),srv=http.createServer(app),io=new Server(srv,{cors:{origin:'*'}});
app.use(express.static(__dirname+'/public'));
const rooms={},COL=['#ff5252','#40c4ff','#ffd740','#69f0ae'],d6=()=>1+Math.floor(Math.random()*6);
const grp=g=>B.map((t,i)=>t.g===g?i:-1).filter(i=>i>=0);
io.on('connection',s=>{
 let r=null;
 const cur=()=>r.pl[r.turn],mine=()=>r&&r.ph!=='lobby'&&cur().id===s.id;
 const log=m=>{r.log.push(m);if(r.log.length>40)r.log.shift()};
 const push=()=>io.to(r.code).emit('state',r);
 const rent=(i,o)=>{const t=B[i];if(t.t==='r')return 25*Object.keys(r.own).filter(k=>r.own[k]===o&&B[k].t==='r').length;
  const b=Math.round(t.p/10),L=r.lv[i]||0;let a=b*[1,5,15,35,55,80][L];if(!L&&grp(t.g).every(k=>r.own[k]===o))a*=2;return a};
 const next=()=>{if(r.ph==='over')return;do r.turn=(r.turn+1)%r.pl.length;while(cur().out);r.ph='roll'};
 const out=p=>{p.out=1;Object.keys(r.own).forEach(k=>{if(r.own[k]===p.id){delete r.own[k];delete r.lv[k]}});log(`💥 ${p.name} bangkrut!`);
  const a=r.pl.filter(q=>!q.out);if(a.length===1){r.ph='over';r.win=a[0].name}};
 const pay=(p,a,to)=>{p.m-=a;if(to)to.m+=a;if(p.m<0)out(p)};
 const jail=p=>{p.pos=10;p.j=3;r.ph='end';log(`🚔 ${p.name} masuk LAPAS`)};
 const land=p=>{const t=B[p.pos];r.ph='end';
  if(t.t==='p'||t.t==='r'){const o=r.own[p.pos];if(o===undefined)r.ph='buy';
   else if(o!==p.id){const ow=r.pl.find(q=>q.id===o),a=rent(p.pos,o);log(`💸 ${p.name} bayar Rp${a}jt ke ${ow.name} (${t.n})`);pay(p,a,ow)}}
  else if(t.t==='x'){log(`🧾 ${p.name} bayar pajak Rp${t.p}jt`);pay(p,t.p)}
  else if(t.t==='g')jail(p);
  else if(t.t==='c'||t.t==='k'){const L=t.t==='c'?K:RC,c=L[Math.floor(Math.random()*L.length)];log(`${t.t==='c'?'🎴':'⚠️'} ${p.name}: ${c[0]}`);
   if(c[1]==='m'){if(c[2]>0)p.m+=c[2];else pay(p,-c[2])}else if(c[1]==='j')jail(p);else{p.m+=200;p.pos=0}}};
 const join=(code,name)=>{const x=rooms[code];if(!x)return s.emit('err','Kode ruangan tidak ditemukan');
  if(x.ph!=='lobby'||x.pl.length>3)return s.emit('err','Ruangan penuh atau sudah mulai');
  r=x;s.join(code);r.pl.push({id:s.id,name:String(name||'Pemain').slice(0,12),c:COL[r.pl.length],pos:0,m:1500,j:0,out:0});
  log(`👋 ${r.pl[r.pl.length-1].name} bergabung`);s.emit('board',{B,G});push()};
 s.on('create',n=>{const c=Math.random().toString(36).slice(2,6).toUpperCase();rooms[c]={code:c,pl:[],own:{},lv:{},turn:0,ph:'lobby',log:[],host:s.id};join(c,n)});
 s.on('join',(c,n)=>join(String(c).trim().toUpperCase(),n));
 s.on('start',()=>{if(r&&r.host===s.id&&r.ph==='lobby'&&r.pl.length>1){r.ph='roll';log('🎲 Permainan dimulai! Bertahanlah di negeri +62');push()}});
 s.on('roll',()=>{if(!mine()||r.ph!=='roll')return;const p=cur(),a=d6(),b=d6();io.to(r.code).emit('dice',[a,b]);
  if(p.j>0){if(a===b){p.j=0;log(`🔓 ${p.name} lolos dari LAPAS`)}
   else{p.j--;log(`⛓️ ${p.name} masih di LAPAS`);if(p.j===0)pay(p,50);next();return push()}}
  const n=(p.pos+a+b)%40;if(n<p.pos){p.m+=200;log(`💰 ${p.name} lewat GAJIAN +Rp200jt`)}
  p.pos=n;log(`🎲 ${p.name} melempar ${a}+${b} → ${B[n].n}`);land(p);if(p.out)next();push()});
 s.on('buy',()=>{if(!mine()||r.ph!=='buy')return;const p=cur(),t=B[p.pos];if(p.m<t.p){log('Uang tidak cukup!');return push()}
  p.m-=t.p;r.own[p.pos]=p.id;log(`🏷️ ${p.name} membeli ${t.n}`);r.ph='end';push()});
 s.on('pass',()=>{if(mine()&&r.ph==='buy'){r.ph='end';push()}});
 s.on('end',()=>{if(mine()&&r.ph==='end'){next();push()}});
 s.on('build',i=>{if(!mine()||!['roll','end'].includes(r.ph))return;const p=cur(),t=B[i];if(!t||t.t!=='p'||r.own[i]!==p.id)return;
  const g=grp(t.g);if(!g.every(k=>r.own[k]===p.id))return;const L=r.lv[i]||0,c=Math.round(t.p/2);
  if(L>4||p.m<c||g.some(k=>(r.lv[k]||0)<L))return;p.m-=c;r.lv[i]=L+1;log(`🏗️ ${p.name} membangun di ${t.n} (level ${L+1})`);push()});
 s.on('disconnect',()=>{if(!r)return;const p=r.pl.find(q=>q.id===s.id);if(!p)return;
  if(r.ph==='lobby'){r.pl=r.pl.filter(q=>q!==p);if(r.host===s.id&&r.pl[0])r.host=r.pl[0].id;if(!r.pl.length)delete rooms[r.code]}
  else if(!p.out){const was=cur()===p;out(p);if(was)next()}
  if(rooms[r.code])push()});
});
srv.listen(process.env.PORT||3000,()=>console.log('Kasuspoly jalan di port',process.env.PORT||3000));
