(function(){
const PCOL=['#0069BD','#FC7608','#5D627D','#F47B50','#004E8F','#E0A100','#8FB8DE','#A6A6A6'];
const P0=[
['p1','Carlos Mendes','318.402.117-50','(11) 98734-2210','carlos.mendes@email.com','Zona Oeste',['t1','t2','t3','t4'],'ativo','2024-03-12'],
['p2','Ana Ribeiro','27.415.903/0001-44','(11) 97120-5588','ana@ribeiroreparos.com.br','Zona Sul',['t5','t6','t7'],'ativo','2024-06-03'],
['p3','João Pires','402.118.965-31','(11) 99402-1876','joao.pires@email.com','Centro',['t1','t2','t4','t8'],'ativo','2024-09-20'],
['p4','Marina Costa','35.882.610/0001-07','(11) 98851-3302','contato@marinacosta.com.br','Zona Oeste',['t2','t3','t7'],'ativo','2025-01-15'],
['p5','Roberto Alves','219.774.380-12','(11) 96677-0914','roberto.alves@email.com','Zona Norte',['t8','t5'],'inativo','2024-05-08'],
['p6','Luciana Prado','41.206.557/0001-90','(11) 95512-7780','luciana.prado@email.com','Zona Leste',['t6','t5'],'ativo','2026-08-27']];
const ini=n=>n.trim().split(/\s+/).filter(Boolean).map(w=>w[0]).filter((c,i,l)=>i===0||i===l.length-1).join('').toUpperCase();
const mkPro=(r,i)=>({id:r[0],name:r[1],ini:ini(r[1]),color:PCOL[i%PCOL.length],doc:r[2],phone:r[3],email:r[4],region:r[5],types:r[6],status:r[7],since:r[8],deleted:false});
let PROS=P0.map(mkPro);
const ME='p1';
const ST={aberto:{l:'Agendado',bg:'#EFF1F3',fg:'#363853'},em_andamento:{l:'Em execução',bg:'#E6F0FA',fg:'#004E8F'},aguardando:{l:'Aguardando aprovação',bg:'#FFEBDC',fg:'#B85200'},reprovado:{l:'Reprovado',bg:'#FFD7D4',fg:'#B8342A'},aprovado:{l:'Aprovado',bg:'#E7F8F1',fg:'#0B8C61'},inviavel:{l:'Inviável',bg:'#F4D8E8',fg:'#A8336A'}};
const PH=['#8FA3A0','#A89A86','#7D8B9C','#9CA88A','#B09A9A','#8E9AAF'];
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const WDL=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const addD=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return d;};
const br=s=>{const p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];};
const hm=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const uid=()=>Math.random().toString(36).slice(2,9);
const at=(date,time,add)=>{const d=new Date(date+'T'+time+':00');d.setMinutes(d.getMinutes()+(add||0));return d.toISOString();};
const hmAdd=(t,m)=>{const d=new Date('2000-01-01T'+t+':00');d.setMinutes(d.getMinutes()+m);return hm(d);};
const fmtTs=s=>{const d=new Date(s);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+' · '+hm(d);};
const dur=m=>Math.floor(m/60)+'h'+pad(Math.round(m%60));
const TYPES0=[
{id:'t1',name:'Vazamento',color:'#0069BD',checklist:['Localizar ponto do vazamento','Fechar registro e isolar a área','Substituir conexão ou vedação','Testar com registro aberto','Limpar área de trabalho']},
{id:'t2',name:'Revisão elétrica',color:'#FC7608',checklist:['Inspecionar quadro de distribuição','Medir tensão das tomadas','Verificar aterramento','Reapertar conexões','Registrar pontos de atenção']},
{id:'t3',name:'Ponto de luz',color:'#5D627D',checklist:['Desligar circuito','Passar fiação','Instalar caixa e luminária','Testar interruptor']},
{id:'t4',name:'Troca de disjuntor',color:'#F47B50',checklist:['Desligar disjuntor geral','Remover disjuntor danificado','Instalar novo disjuntor','Identificar circuito no quadro','Testar com carga']},
{id:'t5',name:'Pintura',color:'#004E8F',checklist:['Proteger móveis e piso','Lixar e corrigir imperfeições','Aplicar fundo preparador','Aplicar duas demãos','Limpar o ambiente']},
{id:'t6',name:'Reparo em gesso',color:'#E0A100',checklist:['Remover parte danificada','Aplicar placa ou massa nova','Lixar e nivelar','Retocar pintura']},
{id:'t7',name:'Limpeza de ar-condicionado',color:'#8FB8DE',checklist:['Desligar o aparelho','Limpar filtros','Higienizar serpentina','Desobstruir dreno','Testar funcionamento']},
{id:'t8',name:'Chaveiro',color:'#A6A6A6',checklist:['Avaliar fechadura','Abrir ou trocar cilindro','Testar chaves','Entregar cópias ao cliente']}];
const NAMED=[
[-6,'Vazamento no banheiro social','Edifício Aurora','Rua Harmonia, 410 · Vila Madalena','09:00','10:30','p1',['t1'],'aprovado',{dur:80}],
[-6,'Pintura do hall de entrada','Condomínio Parque das Flores','Av. Sumaré, 1100 · Perdizes','13:00','17:00','p2',['t5'],'aprovado',{dur:230}],
[-5,'Revisão elétrica anual','Clínica Vida','Av. Paulista, 1578 · Bela Vista','08:00','10:00','p3',['t2'],'reprovado',{dur:95,rev:[['r','Faltou a foto do quadro após o reaperto. Registre e reenvie, por favor.']]}],
[-5,'Troca de disjuntor da cozinha','Residência Souza','Rua Tupi, 221 · Santa Cecília','14:00','15:00','p1',['t4'],'aprovado',{dur:50}],
[-4,'Reparo no forro da sala','Escritório Nunes & Lima','Av. Faria Lima, 3144 · Itaim Bibi','10:00','12:00','p4',['t6'],'aprovado',{dur:130,rev:[['r','A foto final não mostra o retoque da pintura.'],['a','']]}],
[-3,'Ponto de luz na garagem','Residencial Monte Verde','Rua Vergueiro, 2045 · Vila Mariana','09:00','11:00','p1',['t3'],'aprovado',{dur:30,inv:'O teto da garagem é laje protendida, não dá para furar sem laudo. Síndico foi avisado.'}],
[-3,'Limpeza de 4 aparelhos','Academia Forma','Rua Augusta, 1492 · Consolação','14:00','17:00','p2',['t7'],'aprovado',{dur:160}],
[-2,'Troca de fechadura da porta dos fundos','Loja Casa Bela','Rua Oscar Freire, 900 · Jardins','10:00','11:00','p1',['t8'],'aprovado',{dur:40}],
[-2,'Vazamento na pia da copa','Hotel Ipê','Rua Frei Caneca, 569 · Consolação','15:00','16:30','p3',['t1'],'aprovado',{dur:70}],
[-1,'Revisão elétrica e troca de disjuntor','Colégio Aprender','Rua Apinajés, 1500 · Perdizes','08:00','11:00','p1',['t2','t4'],'aguardando',{dur:150}],
[-1,'Pintura da fachada lateral','Padaria Pão Dourado','Rua Cardeal Arcoverde, 820 · Pinheiros','13:00','17:00','p2',['t5'],'aguardando',{dur:210}],
[-1,'Reparo em gesso no quarto','Residência Martins','Rua Teodoro Sampaio, 1020 · Pinheiros','16:00','17:30','p1',['t6'],'reprovado',{dur:60,rev:[['r','A foto do acabamento ficou escura. Refaça e reenvie, por favor.']]}],
[0,'Limpeza de ar-condicionado','Clínica Vida','Rua Pamplona, 145 · Jardim Paulista','07:30','09:00','p1',['t7'],'aguardando',{dur:75}],
[0,'Vazamento no teto do banheiro','Edifício Aurora','Rua Bela Cintra, 1200 · Consolação','10:30','12:30','p1',['t1','t6'],'aberto',{}],
[0,'Ponto de luz na recepção','Escritório Nunes & Lima','Rua Haddock Lobo, 595 · Cerqueira César','15:00','16:30','p1',['t3'],'aberto',{}],
[0,'Revisão elétrica do salão de festas','Condomínio Parque das Flores','Av. Rebouças, 3970 · Pinheiros','09:00','11:00','p4',['t2'],'em_andamento',{}],
[1,'Troca de cilindro e cópias','Loja Casa Bela','Rua Joaquim Antunes, 88 · Pinheiros','09:00','10:00','p1',['t8'],'aberto',{}],
[1,'Pintura e reparo em gesso','Residencial Monte Verde','Rua Oscar Freire, 1120 · Jardins','13:00','17:00','p1',['t5','t6'],'aberto',{}],
[2,'Troca de disjuntores do quadro','Hotel Ipê','Rua Mourato Coelho, 300 · Pinheiros','08:30','10:00','p1',['t4'],'aberto',{}],
[2,'Vazamento na área de serviço','Residência Alves','Rua Cayowaá, 740 · Perdizes','13:00','14:30','p3',['t1'],'aberto',{}],
[3,'Limpeza de ar-condicionado','Mercado Bom Preço','Av. Sumaré, 1100 · Perdizes','10:00','12:00','p2',['t7'],'aberto',{}]];
const CL=['Condomínio Parque das Flores','Edifício Aurora','Loja Casa Bela','Clínica Vida','Residencial Monte Verde','Escritório Nunes & Lima','Padaria Pão Dourado','Academia Forma','Colégio Aprender','Hotel Ipê','Mercado Bom Preço','Residência Souza'];
const AD=['Rua Harmonia, 410 · Vila Madalena','Av. Sumaré, 1100 · Perdizes','Av. Paulista, 1578 · Bela Vista','Rua Tupi, 221 · Santa Cecília','Av. Faria Lima, 3144 · Itaim Bibi','Rua Vergueiro, 2045 · Vila Mariana','Rua Augusta, 1492 · Consolação','Rua Oscar Freire, 900 · Jardins','Rua Frei Caneca, 569 · Consolação','Rua Apinajés, 1500 · Perdizes','Rua Pamplona, 145 · Jardim Paulista','Rua Bela Cintra, 1200 · Consolação'];
const RR=['Foto final sem mostrar o serviço concluído.','Faltou registrar a etapa de teste.','Acabamento precisa de retoque.','Foto desfocada, reenvie por favor.'];
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mk(r,code){
  const [off,title,client,address,start,end,pid,tids,status,x]=r;const date=iso(addD(off));
  const done=['aguardando','aprovado','reprovado'].includes(status);
  const a={id:'a'+code,code:'AC-'+code,title,client,address,date,start,end,pid,status,inviavel:!!x.inv,createdAt:at(iso(addD(Math.min(off-2,-1))),'16:20'),startedAt:null,subs:[],reviews:[],finalPhotos:[],finalComment:'',inv:null};
  let n=0;const ph=t=>({id:uid(),bg:PH[(code+n++)%PH.length],stamp:t});
  a.demandas=tids.map(tid=>{const t=TYPES0.find(y=>y.id===tid);return {id:uid(),typeId:tid,typeName:t.name,color:t.color,steps:t.checklist.map((text,j)=>{const d=x.inv?j<1:done?true:status==='em_andamento'?j<2:false;return {id:uid(),text,done:d,photos:d&&j%2===0?[ph(hmAdd(start,15+j*12))]:[],comment:''};})};});
  if(status!=='aberto')a.startedAt=at(date,start);
  if(done){
    let t=at(date,start,x.dur);a.subs.push(t);
    const rev=x.rev||(status==='aprovado'?[['a','']]:[]);
    rev.forEach((rv,i)=>{const rt=new Date(new Date(t).getTime()+90*60000).toISOString();a.reviews.push({d:rv[0],reason:rv[1],at:rt});if(i<rev.length-1){t=new Date(new Date(rt).getTime()+60*60000).toISOString();a.subs.push(t);}});
    if(x.inv)a.inv={comment:x.inv,photos:[ph(hmAdd(start,x.dur))]};
    else{a.finalPhotos=[ph(hmAdd(start,x.dur-6)),ph(hmAdd(start,x.dur-2))];a.finalComment='Serviço finalizado e testado junto com o cliente.';}
  }
  return a;
}
function seed(){
  const R=rng(7),rows=[];const pick=l=>l[Math.floor(R()*l.length)];
  for(let off=-29;off<=-7;off++){const k=1+(R()<.55?1:0)+(R()<.2?1:0);for(let i=0;i<k;i++){
    const tids=[pick(TYPES0).id];if(R()<.15){const t2=pick(TYPES0).id;if(t2!==tids[0])tids.push(t2);}
    const st=pick(['08:00','09:30','11:00','13:30','15:00']);const d=45+Math.floor(R()*140);const x={dur:d};
    const rr=R();if(rr<.09)x.inv='Condição do local impediu a execução. Cliente foi orientado.';else if(rr<.3)x.rev=[['r',pick(RR)],['a','']];
    rows.push([off,TYPES0.find(t=>t.id===tids[0]).name,pick(CL),pick(AD),st,hmAdd(st,120),pick(PROS.slice(0,4)).id,tids,'aprovado',x]);}}
  const all=rows.concat(NAMED);
  return {v:5,pros:P0.map(mkPro),types:JSON.parse(JSON.stringify(TYPES0)),acs:all.map((r,i)=>mk(r,1001+i))};
}
function deco(a){
  const k=a.status==='aprovado'&&a.inviavel?'inviavel':a.status;const s=ST[k];
  const steps=a.demandas.flatMap(d=>d.steps);const done=steps.filter(x=>x.done).length;
  const pro=window.ACD.PROS.find(p=>p.id===a.pid)||{name:'Prestador removido',ini:'—',color:'#A6A6A6'};
  return Object.assign({},a,{k,stLabel:a.status==='aguardando'&&a.inviavel?'Inviabilidade em análise':s.l,stBg:s.bg,stFg:s.fg,dateBr:br(a.date),dm:br(a.date).slice(0,5),time:a.start+'–'+a.end,proName:pro.name,proIni:pro.ini,proColor:pro.color,typesLabel:a.demandas.map(d=>d.typeName).join(' + '),done,total:steps.length,pct:(steps.length?Math.round(done/steps.length*100):0)+'%',prog:done+'/'+steps.length,mapUrl:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(a.address.replace(' · ',', ')+', São Paulo')});
}
function pv(p,rm){return {id:p.id,isImg:!!p.src,notImg:!p.src,src:p.src||'',bg:p.bg||'#8FA3A0',stamp:p.stamp||'',canRm:!!rm,rm:rm||null};}
function readPhoto(file,cb){const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const s=Math.min(1,480/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',0.7));};img.src=r.result;};r.readAsDataURL(file);}
const XL=()=>import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const digits=s=>String(s||'').replace(/\D/g,'');
const HEAD=['Nome','CPF/CNPJ','Telefone','E-mail','Região','Especialidades','Status','Credenciado desde'];
function toRows(pros,types){return pros.filter(p=>!p.deleted).map(p=>({'Nome':p.name,'CPF/CNPJ':p.doc,'Telefone':p.phone,'E-mail':p.email,'Região':p.region,'Especialidades':p.types.map(t=>(types.find(x=>x.id===t)||{}).name).filter(Boolean).join('; '),'Status':p.status==='ativo'?'Ativo':'Inativo','Credenciado desde':p.since?br(p.since):''}));}
async function exportPros(pros,types,name){const X=await XL();const ws=X.utils.json_to_sheet(toRows(pros,types),{header:HEAD});ws['!cols']=HEAD.map((h,i)=>({wch:[26,20,16,30,14,44,10,16][i]}));const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Credenciados');X.writeFile(wb,name);}
async function template(){const X=await XL();const ws=X.utils.json_to_sheet([{'Nome':'Nome Sobrenome','CPF/CNPJ':'000.000.000-00','Telefone':'(11) 90000-0000','E-mail':'email@exemplo.com','Região':'Zona Oeste','Especialidades':'Vazamento; Pintura','Status':'Ativo','Credenciado desde':''}],{header:HEAD});const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Credenciados');X.writeFile(wb,'modelo-credenciados-russo.xlsx');}
async function parseSheet(file){const X=await XL();const buf=await file.arrayBuffer();const wb=X.read(buf,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const raw=X.utils.sheet_to_json(ws,{defval:''});const map={nome:'name',cpfcnpj:'doc',cpf:'doc',cnpj:'doc',documento:'doc',telefone:'phone',celular:'phone',email:'email',regiao:'region',especialidades:'types',servicos:'types',status:'status',situacao:'status'};return raw.map(r=>{const o={};Object.keys(r).forEach(k=>{const f=map[norm(k)];if(f&&!o[f])o[f]=String(r[k]).trim();});return o;});}
window.ACD={PROS,ME,PCOL,ini,norm,digits,exportPros,template,parseSheet,ST,PH,WD,WDL,pad,iso,addD,br,hm,uid,fmtTs,dur,seed,deco,pv,readPhoto};
})();
