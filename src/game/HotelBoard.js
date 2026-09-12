import {MEDAL_LABELS} from './ChapterRules.js';

// Only completed match days reveal the other results of this fixed bracket.
export function hotelBoard(status){
  const run=status.active;if(!run)return 'Aucun séjour en cours.';
  const won=day=>run.results.find(r=>r.day===day)?.winner;
  const result=(a,b,day)=>!won(day)?`${a} — ${b} · à venir`:won(day)==='player'?`${a} ✓ — ${b}`:`${a} — ${b} ✓`;
  const lines=['JOUR 1 · QUARTS DE FINALE',result('Toi','Marco Bellini',1),`Louis Fortin ${run.results.length?'✓ ':''}— Émile Bouchard`, `André Gagnon ${run.results.length?'✓ ':''}— Maxime Roy`,`Alex Nguyen ${run.results.length?'✓ ':''}— David Santos`];
  lines.push('\nJOUR 2 · DEMI-FINALES');
  lines.push(won(1)==='player'?result('Toi','Louis Fortin',2):won(1)?'Marco Bellini — Louis Fortin · à venir':'Vainqueur Toi / Bellini — Louis Fortin');
  lines.push(`André Gagnon ${run.results.length>=2?'✓ ':''}— Alex Nguyen`);
  lines.push('\nJOUR 3 · FINALE',won(2)==='player'?result('Toi','André Gagnon',3):won(2)?'Louis Fortin — André Gagnon · à venir':'Vainqueurs des demi-finales');
  if(run.medal)lines.push(`\n${MEDAL_LABELS[run.medal]} · souvenir conservé à la maison.`);
  return lines.join('\n');
}
