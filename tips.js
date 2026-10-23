import {forecast,days,today,cycleAnchors,cycleStats,TIP_IDS} from './core.js';
// Short insights based on NHS guidance, reviewed 2026-10-23. Each one: one line of context, one concrete action,
// and a folded "when to consult" with its source. Selection is a local relevance rule, never a symptom or hormone prediction.
const NHS={pms:['NHS · Síndrome premenstrual','https://www.nhs.uk/conditions/pre-menstrual-syndrome/'],pain:['NHS · Dolor menstrual','https://www.nhs.uk/symptoms/period-pain/'],heavy:['NHS · Reglas abundantes','https://www.nhs.uk/conditions/heavy-periods/'],iron:['NHS · Anemia por falta de hierro','https://www.nhs.uk/conditions/iron-deficiency-anaemia/'],bloating:['NHS · Hinchazón','https://www.nhs.uk/conditions/bloating/'],migraine:['NHS · Migraña','https://www.nhs.uk/conditions/migraine/'],breast:['NHS · Dolor de pecho','https://www.nhs.uk/conditions/breast-pain/'],acne:['NHS · Acné','https://www.nhs.uk/conditions/acne/'],late:['NHS · Reglas ausentes o retrasadas','https://www.nhs.uk/conditions/stopped-or-missed-periods/'],irregular:['NHS · Reglas irregulares','https://www.nhs.uk/conditions/irregular-periods/']};
// signals: the daily-log values that mean "this happens to me". "Me pasa" writes the first one into today's log.
export const catalog={
 cramps:{icon:'≈',title:'¿Cólicos?',label:'cólicos',signals:{symptoms:['cramps','backache']},text:'Suelen notarse en el abdomen y pueden irradiar a la espalda y los muslos.',action:'Calor en el abdomen (bolsa envuelta en un paño), un baño caliente o un paseo suave.',consult:'Consulta si el dolor te impide hacer tu vida normal o si las reglas se vuelven más dolorosas, abundantes o irregulares. Pide atención urgente si es intenso o peor de lo habitual y los analgésicos no ayudan.',sources:[NHS.pain]},
 heavy:{icon:'◉',title:'¿Sangrado abundante?',label:'sangrado abundante',signals:{flow:['heavy']},text:'Por ejemplo, cambiar compresa o tampón cada 1–2 horas o necesitar dos productos a la vez.',action:'Anota la intensidad cada día: es lo primero que te preguntarán en una consulta.',consult:'Consulta si te afecta en tu día a día, si dura más de 7 días, si hay coágulos de más de 2,5 cm o si sangras entre reglas o tras las relaciones sexuales.',sources:[NHS.heavy]},
 sleep:{icon:'☾',title:'¿Cansancio o sueño diferente?',label:'cansancio',signals:{symptoms:['fatigue']},text:'Es un síntoma premenstrual habitual, aunque puede tener otras causas.',action:'Prioriza dormir lo suficiente y ajusta la actividad a cómo te encuentres.',consult:'Consulta si el cansancio es persistente, sobre todo con reglas abundantes, falta de aire o palpitaciones: puede ser falta de hierro.',sources:[NHS.pms,NHS.iron]},
 mood:{icon:'✧',title:'¿Más sensible de lo habitual?',label:'cambios de ánimo',signals:{mood:['sensitive','irritable','sad','anxious']},text:'Los cambios de ánimo pueden acompañar los días previos a la regla.',action:'Algo de ejercicio, dormir bien o unos minutos de respiración pueden ayudar.',consult:'Consulta si los cambios afectan a tu vida diaria o no mejoran con estos hábitos. Llevar un registro durante 2 ciclos ayuda a explicarlo.',sources:[NHS.pms]},
 bloating:{icon:'◌',title:'¿Sensación de hinchazón?',label:'hinchazón',signals:{symptoms:['bloating']},text:'Algunas personas la notan alrededor de la regla.',action:'Agua, comidas más pequeñas y frecuentes y menos bebidas con gas o cafeína.',consult:'Consulta si te pasa a menudo o no desaparece, o si viene con pérdida de peso sin buscarla.',sources:[NHS.bloating]},
 headache:{icon:'⌁',title:'¿Dolor de cabeza?',label:'dolor de cabeza',signals:{symptoms:['headache']},text:'Las migrañas justo antes o durante la regla suelen ser más largas e intensas.',action:'Anotarlos ayuda a ver si coinciden con tu ciclo.',consult:'Consulta si tienes migrañas con regularidad antes o durante la regla. Llama a emergencias si el dolor aparece de golpe y es muy intenso, o si te cuesta hablar, ver o mover un lado del cuerpo.',sources:[NHS.migraine]},
 tender:{icon:'○',title:'¿Pecho sensible?',label:'pecho sensible',signals:{symptoms:['tender']},text:'Puede empezar hasta 2 semanas antes de la regla y desaparecer cuando termina.',action:'Un sujetador bien ajustado de día y uno suave para dormir.',consult:'Consulta si no mejora, si los analgésicos no ayudan o si hay antecedentes de cáncer de mama en tu familia.',sources:[NHS.breast]},
 acne:{icon:'·',title:'¿Cambios en la piel?',label:'acné',signals:{symptoms:['acne']},text:'Los cambios hormonales de la regla pueden influir en el acné.',action:'Limpiador suave dos veces al día y sin apretar los granos.',consult:'Si te preocupa o te deja marcas, coméntalo con un profesional.',sources:[NHS.acne]},
 cravings:{icon:'◇',title:'¿Más apetito o antojos?',label:'antojos',signals:{symptoms:['cravings']},text:'Los cambios de apetito son un síntoma premenstrual frecuente.',action:'Comidas más pequeñas cada 2–3 horas pueden sentar mejor.',consult:'Consulta si los síntomas premenstruales afectan a tu vida diaria.',sources:[NHS.pms]},
 late:{icon:'?',title:'Tu regla se retrasa',info:true,text:'Puede deberse a un embarazo, estrés, cambios de peso, mucho ejercicio o la perimenopausia.',action:'Cuando empiece, regístrala: la previsión no se mueve sola.',consult:'Consulta si faltan 3 reglas seguidas o si tus reglas se vuelven irregulares.',sources:[NHS.late]},
 irregular:{icon:'∿',title:'Tus ciclos varían',info:true,text:'El ciclo medio ronda los 28 días; se consideran irregulares por debajo de 21 o por encima de 35.',action:'Registrar el inicio de cada regla es lo que más ayuda a ver tu patrón.',consult:'Consulta si tu patrón cambia, si las reglas duran más de 7 días o si sangras entre reglas.',sources:[NHS.irregular]}
};
for(const [id,t] of Object.entries(catalog))t.id=id;
if(TIP_IDS.some(id=>!catalog[id]?.signals))throw Error('TIP_IDS and the tips catalog are out of sync.');
export const matches=(t,log)=>!!log&&!!t.signals&&Object.entries(t.signals).some(([field,values])=>Array.isArray(log[field])?log[field].some(v=>values.includes(v)):values.includes(log[field]));
// Today's answer: yes when today's log has a signal, no when "No me pasa" was recorded, otherwise none.
export function answer(data,id,date){const t=catalog[id];if(matches(t,data.logs.find(l=>l.date===date)))return true;return (data.tipResponses??[]).find(r=>r.date===date&&r.tip===id)?.value??null;}
// Log + tipResponses changes for a tap on "Me pasa" (true), "No me pasa" (false) or "Deshacer" (null).
export function applyAnswer(data,id,date,value){
 const t=catalog[id],log={date,flow:null,pain:null,mood:[],symptoms:[],note:'',...data.logs.find(l=>l.date===date)};
 for(const [field,values] of Object.entries(t.signals))log[field]=Array.isArray(log[field])?log[field].filter(v=>!values.includes(v)):values.includes(log[field])?null:log[field];
 if(value===true){const [field,values]=Object.entries(t.signals)[0];log[field]=Array.isArray(log[field])?[...log[field],values[0]]:values[0];}
 return {...data,logs:[...data.logs.filter(l=>l.date!==date),log],tipResponses:[...(data.tipResponses??[]).filter(r=>!(r.date===date&&r.tip===id)),...(value===false?[{date,tip:id,value:false}]:[])]};
}
// Position of a date within its cycle: day of cycle (1 = first day) and, when the next start is known, days left before it.
function locate(anchors,date){let i=-1;anchors.forEach((a,j)=>{if(a<=date)i=j;});return i<0?null:{cycle:anchors[i],day:days(date,anchors[i])+1,before:anchors[i+1]?days(anchors[i+1],date):null};}
// A personal pattern: the same topic logged in the same 3-day window of at least 3 of the last 6 annotated cycles,
// and in at least half of them. It describes past annotations; it never predicts.
export function patterns(data){
 const anchors=cycleAnchors(data).map(a=>a.start),logs=data.logs,yes=(data.tipResponses??[]).filter(r=>r.value);
 const annotated=[...new Set([...logs.map(l=>l.date),...yes.map(r=>r.date)].map(d=>locate(anchors,d)?.cycle).filter(Boolean))].sort().slice(-6);
 if(annotated.length<3)return [];
 return TIP_IDS.flatMap(id=>{
  const t=catalog[id],hits=[...logs.filter(l=>matches(t,l)).map(l=>l.date),...yes.filter(r=>r.tip===id).map(r=>r.date)].map(d=>locate(anchors,d)).filter(h=>h&&annotated.includes(h.cycle));
  let best=null;
  for(const kind of ['day','before'])for(let k=1;k<=10;k++){const seen=new Set(hits.filter(h=>h[kind]!==null&&h[kind]>=k&&h[kind]<=k+2).map(h=>h.cycle)),base=kind==='before'?annotated.filter(c=>anchors.indexOf(c)<anchors.length-1).length:annotated.length;if(seen.size>=3&&seen.size>=base/2&&(!best||seen.size>best.cycles))best={id,kind,from:k,to:k+2,cycles:seen.size,of:base};}
  return best?[{...best,text:best.kind==='day'?`En ${best.cycles} de tus últimos ${best.of} ciclos anotaste ${t.label} entre el día ${best.from} y el ${best.to} del ciclo.`:`En ${best.cycles} de tus últimos ${best.of} ciclos anotaste ${t.label} de ${best.from} a ${best.to} días antes de la regla.`}]:[];
 });
}
// Is a pattern's window today? "before" windows rely on the forecast, so only when it is not late and cycles are stable.
function patternToday(p,data,date,f){const here=locate(cycleAnchors(data).map(a=>a.start),date);if(!here)return false;if(p.kind==='day')return here.day>=p.from&&here.day<=p.to;if(!f.next||f.late||f.spread>7)return false;const left=days(f.next,date);return left>=p.from&&left<=p.to;}
export function dailyTips(data,date=today(),count=2){
 const f=forecast(data,date),active=data.periods.some(p=>date>=p.start&&date<=(p.end??date));
 const near=!!f.next&&!f.late&&days(f.next,date)>=0&&days(f.next,date)<=7;
 const uncertain=!f.next||f.late||f.spread>7,st=cycleStats(data),irregular=st.intervals.length>=3&&(st.length<21||st.length>35||st.spread>7);
 const order=active?['cramps','heavy','sleep','headache','mood','bloating','tender','acne','cravings']:near&&!uncertain?['mood','bloating','tender','headache','sleep','cravings','acne','cramps','heavy']:['sleep','mood','bloating','headache','tender','acne','cravings','cramps','heavy'];
 const past=[...(data.tipResponses??[]).filter(r=>r.date<date&&days(date,r.date)<=90)],recentLogs=data.logs.filter(l=>l.date<date&&days(date,l.date)<=90),own=patterns(data);
 // Today's answers do not reorder the cards under the user's finger: only past days and patterns rank.
 const ranked=order.map((id,index)=>{const t=catalog[id],rows=past.filter(r=>r.tip===id),logged=recentLogs.filter(l=>matches(t,l)).length,yes=rows.filter(r=>r.value).length+logged,no=rows.filter(r=>!r.value).length,pattern=own.find(p=>p.id===id),now=pattern&&patternToday(pattern,data,date,f);
  return {...t,index,answer:answer(data,id,date),pattern:pattern?{...pattern,today:now}:null,score:(now?100:0)+yes-no,history:yes+no?`Anotado en ${yes} ${yes===1?'día':'días'} de los últimos 90${no?` · «No me pasa» ${no} ${no===1?'vez':'veces'}`:''}.`:''};}).sort((a,b)=>b.score-a.score||a.index-b.index);
 const info=f.late?[{...catalog.late}]:irregular?[{...catalog.irregular}]:[];
 return {label:f.late?'Fecha por confirmar':active?'Regla registrada':near&&!uncertain?'Fecha orientativa':'Bienestar general',context:active?'Has registrado regla para hoy. Solo son relevantes si notas estas molestias.':near&&!uncertain?'Tu próxima regla podría acercarse según tus fechas. Puede variar.':'No deducimos cómo te sientes a partir del calendario. Cuéntanos qué encaja contigo.',tips:[...info,...ranked.slice(0,count)]};
}
