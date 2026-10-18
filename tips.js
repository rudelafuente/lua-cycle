import {forecast,days} from './core.js';
// Educational text based on NHS PMS and period-pain guidance, reviewed 2026-10-18.
// Selection is a local relevance rule, never a symptom or hormone prediction.
const catalog={
 cramps:{id:'cramps',icon:'≈',title:'¿Molestias o cólicos?',text:'Pueden aparecer antes o durante la regla, aunque no le ocurre a todo el mundo.',action:'Si los notas, prueba calor suave en el abdomen con una tela entre la piel y la bolsa, o un paseo tranquilo.'},
 sleep:{id:'sleep',icon:'☾',title:'¿Cansancio o sueño diferente?',text:'Algunas personas notan cansancio o dificultades para dormir antes de la regla. No podemos saber si es tu caso por el calendario.',action:'Reserva tiempo para descansar y ajusta la actividad a cómo te encuentres hoy.'},
 mood:{id:'mood',icon:'✧',title:'¿Más sensible de lo habitual?',text:'Los cambios de ánimo pueden acompañar los días previos a la regla, pero también tener otras causas.',action:'Si te ocurre, prueba unos minutos de relajación. Anotar cómo te sientes durante dos ciclos puede ayudar a explicarlo en una consulta.'},
 bloating:{id:'bloating',icon:'◌',title:'¿Sensación de hinchazón?',text:'Puede aparecer antes de la regla. No atribuimos una molestia digestiva al ciclo solo por la fecha.',action:'Observa cuándo aparece y si se repite. Si persiste o afecta a tu día a día, coméntalo con un profesional.'}
};
export function dailyTips(data,date){
 const f=forecast(data,date),active=data.periods.some(p=>date>=p.start&&date<=(p.end??date));
 const near=!!f.next&&!f.late&&days(f.next,date)>=0&&days(f.next,date)<=7;
 const uncertain=!f.next||f.late||f.spread>7;
 const order=active?['cramps','sleep','mood','bloating']:near&&!uncertain?['mood','bloating','sleep','cramps']:['sleep','mood','bloating','cramps'];
 const all=data.tipResponses??[],past=all.filter(r=>r.date<date&&days(date,r.date)<=90);
 const ranked=order.map((id,index)=>{const rows=past.filter(r=>r.tip===id),yes=rows.filter(r=>r.value).length;return {...catalog[id],score:yes-(rows.length-yes),index,history:rows.length?`Lo marcaste «Me pasa» en ${yes} de ${rows.length} respuestas recientes.`:''};}).sort((a,b)=>b.score-a.score||a.index-b.index);
 // Today's responses do not reorder the cards under the user's finger.
 return {label:active?'Regla registrada':near&&!uncertain?'Fecha orientativa':'Bienestar general',context:active?'Has registrado regla para hoy. Estos consejos solo son relevantes si notas las molestias.':near&&!uncertain?'Tu próxima regla podría acercarse según tus fechas. Puede variar; estas sensaciones no tienen por qué aparecer.':'No deducimos cómo te sientes a partir del calendario. Puedes decirnos qué encaja contigo.',tips:ranked.slice(0,2)};
}
