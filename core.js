// Pure local calculations. No network, telemetry, or clinical claims.
export const DAY = 86400000;
export const VERSION = '0.5.0';
export const empty = () => ({version:1,periods:[],cycles:[],logs:[],tipResponses:[],desire:[],settings:{cycle:28,duration:5,cycleGuidance:true},lastBackup:null});
// Daily log vocabulary. Ids are stored; labels are only for display and exports.
export const LOG = {
 flow:{spotting:'Manchado',light:'Ligero',medium:'Medio',heavy:'Abundante'},
 pain:['Sin dolor','Leve','Moderado','Intenso'],
 mood:{calm:'Calma',happy:'Alegría',sensitive:'Sensibilidad',irritable:'Irritabilidad',sad:'Tristeza',anxious:'Ansiedad'},
 symptoms:{cramps:'Cólicos',headache:'Dolor de cabeza',backache:'Dolor lumbar',bloating:'Hinchazón',tender:'Pecho sensible',acne:'Acné',fatigue:'Cansancio',cravings:'Antojos'}
};
// Wellbeing topics that accept feedback; their content lives in tips.js.
export const TIP_IDS = ['cramps','heavy','sleep','mood','bloating','headache','tender','acne','cravings'];
export const emptyLog = date => ({date,flow:null,pain:null,mood:[],symptoms:[],note:''});
// Period starts this close to an imported reference replace it as the cycle anchor.
export const ANCHOR_TOLERANCE = 7;
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function validDate(s){return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export const days=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/DAY);
export const addDays=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*DAY).toISOString().slice(0,10);
const median=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n?(n%2?s[n>>1]:(s[n/2-1]+s[n/2])/2):null;};
export function validate(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.periods)||!Array.isArray(raw.desire))throw Error('Formato no reconocido. Se requiere una copia de Lúa versión 1.');
 if(raw.periods.length>5000||raw.desire.length>30000)throw Error('El archivo contiene demasiados registros.');
 const periods=raw.periods.map(p=>{if(!validDate(p.start)||p.start>today()||(p.end!==null&&(!validDate(p.end)||p.end<p.start||p.end>today())))throw Error('Hay fechas de regla inválidas o futuras.');return {start:p.start,end:p.end};}).sort((a,b)=>a.start.localeCompare(b.start));
 periods.forEach((p,i)=>{if(i&&(periods[i-1].end===null||p.start<=periods[i-1].end))throw Error('Hay reglas superpuestas o una regla anterior sin cerrar.');});
 const cycles=validateCycles(raw.cycles??[]),logs=validateLogs(raw.logs??[]);
 const tipResponses=raw.tipResponses??[];
 if(!Array.isArray(tipResponses)||tipResponses.length>30000)throw Error('Respuestas de bienestar inválidas.');
 const tipKeys=new Set();
 const checkedTips=tipResponses.map(r=>{const key=r.date+':'+r.tip;if(!validDate(r.date)||r.date>today()||!TIP_IDS.includes(r.tip)||typeof r.value!=='boolean'||tipKeys.has(key))throw Error('Respuesta de bienestar inválida o duplicada.');tipKeys.add(key);return {date:r.date,tip:r.tip,value:r.value};});
 const seen=new Set();
 const desire=raw.desire.map(r=>{if(!validDate(r.date)||r.date>today()||!Number.isInteger(r.value)||r.value<0||r.value>2||seen.has(r.date))throw Error('Hay registros de deseo inválidos o fechas duplicadas.');seen.add(r.date);return {date:r.date,value:r.value};}).sort((a,b)=>a.date.localeCompare(b.date));
 const cycle=Number(raw.settings?.cycle??28),duration=Number(raw.settings?.duration??5);
 if(!Number.isInteger(cycle)||cycle<15||cycle>90||!Number.isInteger(duration)||duration<1||duration>20)throw Error('Revisa las duraciones de ciclo y regla.');
 return {version:1,periods,cycles,logs,desire,tipResponses:checkedTips,settings:{cycle,duration,cycleGuidance:raw.settings?.cycleGuidance!==false},lastBackup:typeof raw.lastBackup==='string'?raw.lastBackup:null};
}
export function validateLogs(rows){
 if(!Array.isArray(rows)||rows.length>30000)throw Error('Registro diario inválido.');
 const seen=new Set(),tags=(list,options)=>{if(!Array.isArray(list)||new Set(list).size!==list.length||list.some(x=>!Object.hasOwn(options,x)))throw Error('Registro diario con opciones no reconocidas.');return Object.keys(options).filter(k=>list.includes(k));};
 return rows.map(r=>{
 if(!validDate(r.date)||r.date>today()||seen.has(r.date))throw Error('Registro diario con fechas inválidas o duplicadas.');seen.add(r.date);
 const flow=r.flow??null,pain=r.pain??null,note=r.note??'';
 if(flow!==null&&!Object.hasOwn(LOG.flow,flow))throw Error('Intensidad de sangrado no reconocida.');
 if(pain!==null&&(!Number.isInteger(pain)||pain<0||pain>3))throw Error('Nivel de dolor no reconocido.');
 if(typeof note!=='string'||note.length>1000)throw Error('La nota del día admite hasta 1000 caracteres.');
 return {date:r.date,flow,pain,mood:tags(r.mood??[],LOG.mood),symptoms:tags(r.symptoms??[],LOG.symptoms),note:note.trim()};
 }).filter(r=>r.flow!==null||r.pain!==null||r.mood.length||r.symptoms.length||r.note).sort((a,b)=>a.date.localeCompare(b.date));
}
// Intervals outside 15–90 days, or far above the recent median (a probable missed record), are kept for display but not used.
export function cycleIntervals(data){
 const p=cycleAnchors(data),all=p.slice(1).map((x,i)=>({start:p[i].start,length:days(x.start,p[i].start)}));
 const plausible=all.filter(x=>x.length>=15&&x.length<=90),m=median(plausible.slice(-6).map(x=>x.length));
 return all.map(x=>({...x,used:x.length>=15&&x.length<=90&&!(plausible.length>=3&&x.length>m*1.6)}));
}
export function cycleStats(data){
 const all=cycleIntervals(data),intervals=all.filter(x=>x.used).slice(-6).map(x=>x.length);
 const length=Math.round(median(intervals)??data.settings.cycle);
 // Confirmed periods first; imported Flo period lengths only while there are none; then the setting.
 const durations=data.periods.filter(x=>x.end).slice(-6).map(x=>days(x.end,x.start)+1),imported=(data.cycles??[]).filter(c=>c.periodDays).slice(-6).map(c=>c.periodDays);
 const durationSource=durations.length?'periods':imported.length?'imported':'settings';
 return {length,duration:Math.round(median(durations)??median(imported)??data.settings.duration),durationSource,intervals,excluded:all.filter(x=>!x.used).length,spread:intervals.length?Math.max(...intervals)-Math.min(...intervals):0};
}
export function forecast(data,date=today()){
 const stats=cycleStats(data),last=cycleAnchors(data).at(-1);
 if(!last)return {...stats,next:null,range:null,cycleDay:null,late:false};
 const next=addDays(last.start,stats.length),margin=stats.intervals.length>=2?Math.max(2,Math.ceil(stats.spread/2)):4;
 return {...stats,next,range:[addDays(next,-margin),addDays(next,margin)],cycleDay:days(date,last.start)+1,late:date>addDays(next,margin)};
}
// Upcoming estimated periods. A late forecast is never rolled forward, so it projects nothing.
export function projections(data,count=6,date=today()){
 const f=forecast(data,date);if(!f.next||f.late)return [];
 return Array.from({length:count},(_,i)=>{const start=addDays(f.next,i*f.length);return {start,end:addDays(start,f.duration-1)};});
}
// An open period this old was probably never closed: registering a period then creates a new one instead of editing it.
export const STALE_OPEN = 15;
export function staleOpen(data,date=today()){const p=data.periods.find(p=>p.end===null);return p&&days(date,p.start)>=STALE_OPEN?p:null;}
// When a new period starts after one left open, propose closing the old one; never applied without confirmation.
export function closeOpenBefore(data,start){
 const open=data.periods.find(p=>p.end===null&&p.start<start);if(!open)return null;
 return {start:open.start,end:[addDays(open.start,cycleStats(data).duration-1),addDays(start,-1),today()].sort()[0]};
}
export function cycleHistory(data){
 const iv=cycleIntervals(data);
 return cycleAnchors(data).map((a,i)=>{const p=data.periods.find(p=>p.start===a.start);return {start:a.start,reference:a.reference,end:p?.end??null,bleeding:p?.end?days(p.end,p.start)+1:null,importedBleeding:a.reference?(data.cycles.find(c=>c.start===a.start)?.periodDays??null):null,length:iv[i]?.length??null,used:iv[i]?.used??false};});
}
export function logSummary(data,from,to=today()){
 const rows=(data.logs??[]).filter(l=>l.date>=from&&l.date<=to);
 const count=field=>Object.entries(LOG[field]).map(([id,label])=>({id,label,days:rows.filter(l=>l[field].includes(id)).length})).filter(x=>x.days).sort((a,b)=>b.days-a.days);
 return {days:rows.length,flow:rows.filter(l=>l.flow).length,pain:rows.filter(l=>l.pain>0).length,symptoms:count('symptoms'),mood:count('mood')};
}
function phaseFor(data,date){
 const ps=cycleAnchors(data);let idx=-1;ps.forEach((p,i)=>{if(p.start<=date)idx=i;});
 if(idx<0)return null;
 const len=ps[idx+1]?days(ps[idx+1].start,ps[idx].start):cycleStats(data).length;
 const offset=days(date,ps[idx].start);if(offset>=len||len<=0)return null;
 return {bucket:Math.min(3,Math.floor(offset/len*4)),cycle:ps[idx].start};
}
export function desireEstimate(data,date){
 if(!data.settings.cycleGuidance)return {title:'Orientación desactivada',detail:'Puedes seguir registrando cómo te sientes.',kind:'none'};
 const phase=phaseFor(data,date);if(!phase)return {title:'Sin orientación para esta fecha',detail:'Registra el ciclo actual para poder situar esta fecha.',kind:'none'};
 const samples=data.desire.map(r=>({...r,phase:phaseFor(data,r.date)})).filter(r=>r.phase);
 const local=samples.filter(r=>r.phase.bucket===phase.bucket);
 const cycles=new Set(local.map(r=>r.phase.cycle));
 if(local.length>=6&&cycles.size>=3){
  const counts=[0,0,0];local.forEach(r=>counts[r.value]++);
  const winner=counts.indexOf(Math.max(...counts)),agreement=counts[winner]/local.length;
  if(agreement<0.67)return {title:'Sin patrón claro',detail:`Tus ${local.length} registros en esta parte del ciclo varían. No hay una tendencia consistente.`,kind:'personal'};
  return {title:['Tendencia a menos ganas','Tendencia a ganas habituales','Tendencia a más ganas'][winner],detail:`Orientación experimental basada en ${local.length} registros de ${cycles.size} ciclos en esta parte del ciclo. Puede cambiar.`,kind:'personal'};
 }
 return {title:phase.bucket===1?'Posible aumento del deseo':'Tu patrón está por descubrir',detail:phase.bucket===1?'Referencia general de la parte media del ciclo; puede no coincidir contigo. No indica ovulación ni fertilidad.':`Aún no hay suficientes correcciones en esta parte del ciclo (${local.length} registros en ${cycles.size} ciclos).`,kind:'general'};
}
export function mergePeriods(data,rows){
 const combined=data.periods.map(p=>({...p}));let added=0,duplicates=0,updated=0;
 for(const row of rows){const old=combined.find(p=>p.start===row.start);if(old){if(old.end===row.end){duplicates++;continue;}if(old.end===null&&row.end!==null){old.end=row.end;updated++;continue;}if(row.end===null){duplicates++;continue;}throw Error(`Dos finales distintos para la regla del ${row.start}. Corrige el registro antes de importar.`);}combined.push({...row});added++;}
 return {data:validate({...data,periods:combined}),added,duplicates,updated};
}
export function parseCSV(text){
 const sep=text.split(/\r?\n/)[0].includes(';')?';':',';const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===sep&&!quoted){row.push(field.trim());field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw Error('CSV con comillas sin cerrar.');row.push(field.trim());if(row.some(Boolean))rows.push(row);
 if(rows.length<2)throw Error('El CSV debe contener encabezados y al menos una fila.');
 const headers=rows.shift().map((x,i)=>x.replace(/^\uFEFF/,'')||`Columna ${i+1}`);
 if(rows.some(r=>r.length!==headers.length))throw Error('El número de columnas no coincide en todas las filas.');return {headers,rows};
}
export function parseDate(value,format){
 const s=value.trim();if(!s)return null;let date=s;
 if(format==='dmy'){const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(!m)throw Error(`Fecha no reconocida: ${s}`);date=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
 if(!validDate(date))throw Error(`Fecha no válida: ${s}`);return date;
}
const b64=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function keyFor(password,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encrypt(data,password){if(password.length<12)throw Error('Usa una contraseña de al menos 12 caracteres.');const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await keyFor(password,salt);const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(validate(data))));return {format:'lua-encrypted',version:1,kdf:'PBKDF2-SHA256',iterations:600000,salt:b64(salt),iv:b64(iv),cipher:b64(new Uint8Array(cipher))};}
export async function decrypt(payload,password){if(payload.format!=='lua-encrypted'||payload.version!==1||payload.iterations!==600000)throw Error('Formato de copia cifrada incompatible.');try{const salt=unb64(payload.salt),iv=unb64(payload.iv);if(salt.length!==16||iv.length!==12)throw Error();const key=await keyFor(password,salt);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,unb64(payload.cipher));return validate(JSON.parse(new TextDecoder().decode(plain)));}catch{throw Error('No se puede abrir la copia. Contraseña incorrecta o archivo dañado.');}}
export function demoData(){const d=empty();const t=today();for(let n=5;n>=0;n--){const start=addDays(t,-12-n*28);d.periods.push({start,end:addDays(start,4)});for(const offset of [2,8,9,16,23])d.desire.push({date:addDays(start,offset),value:offset===8||offset===9?2:1});}d.desire=d.desire.filter(r=>r.date<=t);d.logs=d.periods.flatMap(p=>[{...emptyLog(p.start),flow:'medium',pain:2,symptoms:['cramps']},{...emptyLog(addDays(p.start,1)),flow:'heavy',pain:1,symptoms:['cramps','fatigue']},{...emptyLog(addDays(p.start,-3)),mood:['sensitive'],symptoms:['bloating']}]).filter(l=>l.date<=t);return validate(d);}

// Imported cycle boundaries are reference data, never bleeding intervals.
export function validateCycles(rows){
 if(!Array.isArray(rows)||rows.length>5000)throw Error('Historial de ciclos inválido.');
 const seen=new Set();
 return rows.map(r=>{
 if(!validDate(r.start)||r.start>today()||seen.has(r.start))throw Error('Inicio de ciclo inválido o duplicado.');seen.add(r.start);
 const end=r.end??null,predictedEnd=r.predictedEnd??null;
 if(end!==null&&(!validDate(end)||end<r.start||end>today()))throw Error('Fin de ciclo inválido.');
 if(predictedEnd!==null&&(!validDate(predictedEnd)||predictedEnd<r.start))throw Error('Previsión de ciclo inválida.');
 const periodDays=r.periodDays??null;
 if(periodDays!==null&&(!Number.isInteger(periodDays)||periodDays<1||periodDays>20||(end&&periodDays>days(end,r.start)+1)))throw Error('Duración de regla importada inválida.');
 if(!['completed_as_shown','ongoing'].includes(r.status))throw Error('Estado de ciclo no reconocido.');
 if(r.status==='completed_as_shown'&&!end)throw Error('Falta el final del ciclo transcrito.');
 if(r.status==='ongoing'&&end)throw Error('Un ciclo en curso no debe tener un final confirmado.');
 return {start:r.start,end,predictedEnd,periodDays,status:r.status,source:'Flo · transcripción',bleedingConfirmed:false};
 }).sort((a,b)=>a.start.localeCompare(b.start)).map((r,i,a)=>{if(i&&a[i-1].end&&a[i-1].end>=r.start)throw Error('Ciclos superpuestos.');if(i&&a[i-1].status==='ongoing')throw Error('El ciclo en curso debe ser el último.');return r;});
}
// Imported (unconfirmed) period days from Flo covering a date, unless a confirmed period already does.
export function importedPeriodOn(data,date){if(date>today()||data.periods.some(p=>date>=p.start&&date<=(p.end??today())))return null;return (data.cycles??[]).find(c=>c.periodDays&&date>=c.start&&date<=addDays(c.start,c.periodDays-1))??null;}
export function cycleAnchors(data){const refs=(data.cycles??[]).filter(c=>!data.periods.some(p=>Math.abs(days(p.start,c.start))<=ANCHOR_TOLERANCE));return [...data.periods.map(p=>({start:p.start,reference:false})),...refs.map(c=>({start:c.start,reference:true}))].sort((a,b)=>a.start.localeCompare(b.start));}
export function importCycleHistory(data,raw){
 if(raw.format!=='cycle-history-json'||raw.schema_version!=='1.0'||!Array.isArray(raw.cycles)||!raw.cycles.length)throw Error('Formato de ciclos no reconocido.');
 const rows=validateCycles(raw.cycles.map(c=>{
 if(c.length_days!==undefined&&(!c.end_date||days(c.end_date,c.start_date)+1!==c.length_days))throw Error('La duración del ciclo no coincide con sus fechas.');
 if(c.status==='ongoing'&&c.end_date_confirmed===true)throw Error('Estado contradictorio en el ciclo actual.');
 return {start:c.start_date,end:c.end_date??null,predictedEnd:c.predicted_end_date??null,periodDays:c.period_length_days??null,status:c.status};}));
 const combined=[...(data.cycles??[])];let added=0,duplicates=0,updated=0;
 // A re-import may only add the imported period length to an existing reference; any other difference is a conflict.
 for(const r of rows){const i=combined.findIndex(c=>c.start===r.start),old=combined[i];if(old){if(JSON.stringify(old)===JSON.stringify(r)){duplicates++;continue;}if(old.periodDays===null&&JSON.stringify({...old,periodDays:r.periodDays})===JSON.stringify(r)){combined[i]=r;updated++;continue;}throw Error('Existe una referencia distinta para el ciclo del '+r.start+'. Elimínala antes de importar.');}combined.push(r);added++;}
 return {data:validate({...data,cycles:combined}),added,duplicates,updated,rows};
}
