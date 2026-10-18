// Pure local calculations. No network, telemetry, or clinical claims.
export const DAY = 86400000;
export const empty = () => ({version:1,periods:[],desire:[],settings:{cycle:28,duration:5,cycleGuidance:true},lastBackup:null});
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
 const seen=new Set();
 const desire=raw.desire.map(r=>{if(!validDate(r.date)||r.date>today()||!Number.isInteger(r.value)||r.value<0||r.value>2||seen.has(r.date))throw Error('Hay registros de deseo inválidos o fechas duplicadas.');seen.add(r.date);return {date:r.date,value:r.value};}).sort((a,b)=>a.date.localeCompare(b.date));
 const cycle=Number(raw.settings?.cycle??28),duration=Number(raw.settings?.duration??5);
 if(!Number.isInteger(cycle)||cycle<15||cycle>90||!Number.isInteger(duration)||duration<1||duration>20)throw Error('Revisa las duraciones de ciclo y regla.');
 return {version:1,periods,desire,settings:{cycle,duration,cycleGuidance:raw.settings?.cycleGuidance!==false},lastBackup:typeof raw.lastBackup==='string'?raw.lastBackup:null};
}
export function cycleStats(data){
 const p=data.periods, intervals=p.slice(1).map((x,i)=>days(x.start,p[i].start)).slice(-6);
 const length=Math.round(median(intervals)??data.settings.cycle);
 const durations=p.filter(x=>x.end).slice(-6).map(x=>days(x.end,x.start)+1);
 return {length,duration:Math.round(median(durations)??data.settings.duration),intervals,spread:intervals.length?Math.max(...intervals)-Math.min(...intervals):0};
}
export function forecast(data,date=today()){
 const stats=cycleStats(data),last=data.periods.at(-1);
 if(!last)return {...stats,next:null,range:null,cycleDay:null,late:false};
 const next=addDays(last.start,stats.length),margin=stats.intervals.length>=2?Math.max(2,Math.ceil(stats.spread/2)):4;
 return {...stats,next,range:[addDays(next,-margin),addDays(next,margin)],cycleDay:days(date,last.start)+1,late:date>addDays(next,margin)};
}
function phaseFor(data,date){
 const ps=data.periods;let idx=-1;ps.forEach((p,i)=>{if(p.start<=date)idx=i;});
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
export function demoData(){const d=empty();const t=today();for(let n=5;n>=0;n--){const start=addDays(t,-12-n*28);d.periods.push({start,end:addDays(start,4)});for(const offset of [2,8,9,16,23])d.desire.push({date:addDays(start,offset),value:offset===8||offset===9?2:1});}d.desire=d.desire.filter(r=>r.date<=t);return validate(d);}
