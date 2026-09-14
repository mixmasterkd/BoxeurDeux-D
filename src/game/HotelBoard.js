import {MEDAL_LABELS} from './ChapterRules.js';

// Bracket names come from the active edition. A result is revealed only once
// its day has been completed, so future rounds cannot spoil a new opponent.
export function hotelBoard(status){
  const run=status.active;if(!run)return 'Aucun séjour en cours.';
  const gold=(run.tier??status.tier)==='gold';
  const ids=status.opponents??(gold?['gold-rios','gold-moreau','gold-santos']:['bellini','fortin','gagnon']);
  const fallback=gold?['Rafael Ríos','Émile Moreau','Thiago Santos']:['Marco Bellini','Louis Fortin','André Gagnon'];
  const names=ids.map((id,i)=>status.participants?.find(p=>p.id===id)?.name??fallback[i]);
  const extras=(status.participants??[]).filter(p=>p.id!=='player'&&!ids.includes(p.id)).map(p=>p.name);
  const [a,b,c]=names,[d,e,f,g]=extras.length>=4?extras:(gold?['Noah Tremblay','Hugo Vidal','Malik Dufour','Enzo Costa']:['Émile Bouchard','Maxime Roy','Alex Nguyen','David Santos']);
  const won=day=>run.results.find(r=>r.day===day)?.winner;
  const result=(left,right,day)=>!won(day)?`${left} — ${right} · à venir`:won(day)==='player'?`${left} ✓ — ${right}`:`${left} — ${right} ✓`;
  const lines=['JOUR 1 · QUARTS DE FINALE',result('Toi',a,1),`${b} ${run.results.length?'✓ ':''}— ${d}`,`${c} ${run.results.length?'✓ ':''}— ${e}`,`${f} ${run.results.length?'✓ ':''}— ${g}`];
  lines.push('\nJOUR 2 · DEMI-FINALES');
  lines.push(won(1)==='player'?result('Toi',b,2):won(1)?`${a} — ${b} · à venir`:`Vainqueur Toi / ${gold?a:'Bellini'} — ${b}`);
  lines.push(`${c} ${run.results.length>=2?'✓ ':''}— ${f}`);
  lines.push('\nJOUR 3 · FINALE',won(2)==='player'?result('Toi',c,3):won(2)?`${b} — ${c} · à venir`:'Vainqueurs des demi-finales');
  if(run.medal)lines.push(`\n${MEDAL_LABELS[run.medal]} · souvenir conservé à la maison.`);
  return lines.join('\n');
}
