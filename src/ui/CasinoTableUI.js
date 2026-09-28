import {careerProfile} from '../game/CareerProfile.js';
import {formatCasinoMoney as money} from '../game/CasinoRules.js';
import {BLACKJACK_RULES, blackjackActions, blackjackValue} from '../game/casino/BlackjackGame.js';
import {ROULETTE_RULES, rouletteColor} from '../game/casino/RouletteGame.js';
import {SLOT_MACHINES, getSlotMachine, SLOTS_RULES} from '../game/casino/SlotsGame.js';
import {pokerActions, pokerPublicState, cardLabel} from '../game/casino/PokerGame.js';
import {careerMenuOpen} from './GameControls.js';
import './casino.css';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const choice=(id,label,disabled=false)=>({id:`casino-${id}`,label,disabled});
const names={blackjack:'Le blackjack de Karl',roulette:'La roulette',slots:'Les machines',poker:'Le salon Hold’em'};
const symbols={cerise:'●',citron:'◆',cloche:'♟',sept:'7',diamant:'♦',metro:'M',etoile:'★',lune:'☾'};
const resultNames={blackjack:'Blackjack !',win:'Main gagnante',push:'Égalité',lose:'Karl gagne',bust:'Plus de 21'};
const pokerRules='Quatre joueurs, caves de 10 ou 20 $, petites et grosses blinds de 1 et 2 $. Deux cartes privées, puis cinq cartes communes : flop, turn et river. La meilleure combinaison de cinq cartes gagne. Tu peux suivre, checker, relancer, te coucher ou faire tapis. Les pots secondaires respectent ce que chacun a engagé. Pas de prélèvement. Chaque main est indépendante; ta cave restante et tes gains reviennent dans tes jetons en fin de main. Le bouton tourne à la main suivante. Luc bluffe parfois, Mireille choisit ses mains, Marco suit volontiers; aucun ne voit tes cartes.';

export class CasinoTableUI {
  constructor({scene,onClose}){
    this.scene=scene;this.onClose=onClose;this.game=null;this.options={};this.page='setup';this.message='';
    this.bet=1;this.buyIn=10;this.bets=[];this.raiseTo=0;this.animation=0;this.botClock=0;this.confirm=null;
    this.tick=this.tick.bind(this);scene.events.on('update',this.tick);
  }
  get opened(){return this.game!==null;}
  get active(){const a=careerProfile.casinoStatus().active;return a?.game===this.game?a:null;}
  get locked(){return this.scene.world.state.paused||this.scene.changingPlace||this.scene.ui.portraitQuery.matches||document.hidden||careerMenuOpen();}
  open(game,options={}){
    this.game=game;this.options={...options};this.message='';this.confirm=null;this.animation=0;this.botClock=0;
    const a=careerProfile.casinoStatus().active;
    if(a){this.game=a.game;this.options={...a.options};this.page='play';}
    else {this.page='setup';if(game==='roulette')this.bets=[];}
    this.scene.world.releaseControls();this.render();
  }
  settings(){
    if(this.game==='blackjack')return{bet:this.bet};
    if(this.game==='poker')return{buyIn:this.buyIn,button:careerProfile.casinoStatus().rounds%4};
    if(this.game==='roulette')return{bets:this.bets};
    return{machineId:this.options.machineId??'cerises'};
  }
  start(){
    const r=careerProfile.casinoStart(this.game,this.settings());
    this.message=r.ok?'':r.message;
    if(r.ok){this.page='play';this.animation=['slots','roulette'].includes(this.game)?1200:350;this.botClock=0;this.scene.animateKarl?.('deal');}
    this.scene.refreshProfile();this.scene.refreshCasinoReadout?.();this.render();
  }
  act(action){
    const r=careerProfile.casinoAct(action);this.message=r.ok?'':r.message;this.confirm=null;this.botClock=0;
    if(r.ok)this.scene.animateKarl?.(this.active?.settled?'pay':'deal');
    this.scene.refreshProfile();this.scene.refreshCasinoReadout?.();this.render();
  }
  choose(id){
    if(!id.startsWith('casino-'))return false;
    if(this.locked||this.animation>0)return true;
    const cmd=id.slice(7);
    if(cmd==='close'){this.close();return true;}
    if(cmd==='rules'){this.returnPage=this.page==='pause'?'play':this.page;this.page='rules';this.render();return true;}
    if(cmd==='resume'){this.page=this.returnPage??(this.active?'play':'setup');this.confirm=null;this.render();return true;}
    if(cmd==='new'){careerProfile.casinoDismiss();this.page='setup';this.message='';this.render();return true;}
    if(cmd==='start'||cmd==='play'){this.start();return true;}
    if(cmd==='clear'){this.bets=[];this.message='';this.render();return true;}
    if(cmd==='add-bet'){
      const [type,value]=this.rouletteChoice.split(':');this.addBet(type,['number','column','dozen'].includes(type)?Number(value):value);return true;
    }
    if(cmd.startsWith('bj-')){this.act(cmd.slice(3));return true;}
    if(cmd==='poker-confirm'){this.act(this.confirm);return true;}
    if(cmd==='poker-cancel'){this.confirm=null;this.render();return true;}
    if(cmd.startsWith('poker-')){
      const type=cmd.slice(6),a=this.active;
      if(!a||a.state.turn!==0)return true;
      const legal=pokerActions(a.state);
      const action=type==='raise'?{type,amount:this.raiseTo}:{type:type==='allin'?'all-in':type};
      const goesAllIn=type==='allin'||type==='raise'&&this.raiseTo===legal.maxRaiseTo||type==='call'&&legal.callAmount>=a.state.players[0].stack;
      if(goesAllIn){this.confirm=action;this.render();}else this.act(action);
      return true;
    }
    return true;
  }
  addBet(type,value){
    if(this.bets.reduce((n,b)=>n+b.amount,0)>=5){this.message='Maximum 5 jetons sur ce tour.';this.render();return;}
    const b=this.bets.find(b=>b.type===type&&b.value===value);if(b)b.amount++;else this.bets.push({type,value,amount:1});
    this.message='';this.render();
  }
  back(){
    if(this.animation>0)return;
    if(this.confirm){this.confirm=null;this.render();return;}
    if(this.page==='rules'||this.page==='pause'){this.page=this.returnPage??'play';this.render();return;}
    if(this.active&&!this.active.settled){this.returnPage='play';this.page='pause';this.render();return;}
    this.close();
  }
  close(){
    if(this.active&&!this.active.settled){this.returnPage='play';this.page='pause';this.render();return;}
    careerProfile.casinoDismiss();this.removeView();this.game=null;this.animation=0;this.onClose?.();
  }
  removeView(){const p=this.scene.ui.root.querySelector('.gym-dialog');p?.classList.remove('casino-window');p?.querySelector('.casino-table-view')?.remove();if(p){delete p.dataset.game;delete p.dataset.phase;}}
  destroy(){this.scene.events.off('update',this.tick);this.game=null;this.removeView();}
  tick(_time,delta){
    if(!this.opened||this.locked||this.page!=='play')return;
    if(this.animation>0){this.animation-=Math.min(delta,100);if(this.animation<=0)this.render();return;}
    const a=this.active;
    if(this.game==='poker'&&a&&!a.settled&&a.state.turn!==0){
      this.botClock+=Math.min(delta,100);
      if(this.botClock>=750){this.botClock=0;this.act('bot');}
    }
  }
  render(){
    if(!this.opened)return;
    const a=this.active,status=careerProfile.casinoStatus(),playing=this.page==='play',busy=this.animation>0;
    let title=names[this.game],text='',actions=[];
    if(this.game==='slots')title=getSlotMachine(this.options.machineId??'cerises').name;
    if(this.page==='rules'){
      text=this.game==='blackjack'?BLACKJACK_RULES.text:this.game==='roulette'?ROULETTE_RULES:this.game==='poker'?pokerRules:SLOTS_RULES;
      actions=[choice('resume','← Revenir à la table')];
    }else if(this.page==='pause'){
      title='Ta main t’attend';text='La mise et les cartes sont conservées. Reprends quand tu veux; quitter le navigateur reprendra cette même main.';
      actions=[choice('resume','Reprendre la main'),choice('rules','Consulter les règles')];
    }else if(this.confirm){
      title='Faire tapis ?';text=`Tu engages les ${a.state.players[0].stack} jetons restants de ta cave. Tu pourras gagner uniquement les pots couverts par ta mise.`;
      actions=[choice('poker-cancel','Garder ma décision en attente'),choice('poker-confirm','Confirmer mon tapis')];
    }else if(!playing){
      if(this.game==='blackjack')text='Karl : « Salut ! Une petite partie ? » Choisis ta mise. Blackjack payé 3:2.';
      if(this.game==='poker')text='Luc, Mireille et Marco t’attendent. Blinds : 1 / 2 jetons. Choisis ta cave pour cette main.';
      if(this.game==='roulette')text='Pose jusqu’à cinq jetons de 1 $. Choisis un numéro sur le tapis ou une mise extérieure.';
      if(this.game==='slots')text='Un tour : 1 jeton. Les lots et leurs probabilités sont disponibles dans les règles.';
      const offer=careerProfile.casinoOffer(this.game,this.settings());
      if(!offer.ok)text+=`\n${offer.message}`;
      actions=[choice(this.game==='slots'?'play':'start',this.game==='roulette'?'Lancer la bille':this.game==='slots'?'Jouer · 1 jeton':this.game==='poker'?'M’installer et distribuer':'Distribuer les cartes',!offer.ok)];
      if(this.game==='roulette')actions.push(choice('add-bet','Ajouter 1 jeton extérieur',this.bets.reduce((s,b)=>s+b.amount,0)>=5),choice('clear','Retirer mes mises',!this.bets.length));
      actions.push(choice('rules','Règles et gains'),choice('close','← Revenir à la salle'));
    }else if(a){
      if(busy)text=this.game==='roulette'?'La bille tourne…':this.game==='slots'?'Les rouleaux tournent…':'Karl distribue…';
      else if(a.settled){
        const payout=this.game==='poker'?a.state.result.payout:a.state.payout,net=payout-a.stake;
        text=`${net>0?'Gagné':net<0?'Perdu':'Égalité'} : ${money(Math.abs(net))}. ${money(payout)} retournés dans tes jetons.`;
        actions=[choice('new','Nouvelle main / nouveau tour'),choice('rules','Règles et gains'),choice('close','← Revenir à la salle')];
      }else if(this.game==='blackjack'){
        text=`Main ${a.state.activeHand+1} · mise totale ${money(a.stake)}`;
        const legal=blackjackActions(a.state);
        actions=[['hit','Tirer'],['stand','Rester'],['double','Doubler'],['split','Séparer']].map(([id,label])=>choice(`bj-${id}`,label,!legal.includes(id)));
        actions.push(choice('rules','Règles'));
      }else if(this.game==='poker'){
        const s=a.state,legal=pokerActions(s);
        text=s.turn===0?'À toi de jouer.':`${s.players[s.turn]?.name??'La table'} réfléchit…`;
        if(s.turn===0){
          actions=[choice('poker-check','Checker',!legal.check),choice('poker-call',`Suivre · ${legal.callAmount??0} jetons`,!legal.call),choice('poker-raise','Relancer',!legal.raise),choice('poker-fold','Me coucher',!legal.fold),choice('poker-allin','Faire tapis',!legal.allIn)];
        }
        actions.push(choice('rules','Règles / pause'));
      }
    }
    const saved=careerProfile.saveStatus();
    if(this.message)text+=`\n${this.message}`;
    if(!saved.persisted&&careerProfile.storage)text+=`\n${saved.message}`;
    const compact=this.scene.ui.controlsQuery.matches&&window.innerWidth<=900;
    if(compact&&this.page!=='pause'&&!this.confirm)title=({blackjack:'Blackjack',roulette:'Roulette',poker:'Hold’em',slots:getSlotMachine(this.options.machineId??'cerises').name})[this.game];
    this.scene.ui.showDialog({speaker:compact?`${status.chips} JETONS`:`CASINO · ${status.chips} JETONS · ${money(status.money)}`,title,text,actions:actions.length?actions:[choice('rules','Un instant…',true)]});
    const p=this.scene.ui.root.querySelector('.gym-dialog');p.classList.add('casino-window');p.dataset.game=this.game;p.dataset.phase=this.page==='play'?(busy?'animating':a?.state.status??'setup'):this.page;
    p.querySelector('.casino-table-view')?.remove();
    const view=el('div','casino-table-view');p.querySelector('.gym-dialog-copy').append(view);
    if(this.page==='rules'){if(this.game==='slots')this.drawSlotRules(view);return;}
    if(this.page==='pause'||this.confirm)return;
    if(!playing){
      if(this.game==='blackjack'){this.select(view,'Mise',[[1,'1 $'],[2,'2 $'],[3,'3 $'],[4,'4 $'],[5,'5 $']],this.bet,v=>{this.bet=Number(v);this.render();});this.drawKarl(view,0);}
      else if(this.game==='poker'){this.select(view,'Cave',[[10,'10 jetons'],[20,'20 jetons']],this.buyIn,v=>{this.buyIn=Number(v);this.render();});this.drawProfiles(view);}
      else if(this.game==='roulette')this.drawRouletteBets(view);
      else this.drawSlots(view,null,false);
    }else if(a){
      if(this.game==='blackjack')this.drawBlackjack(view,a.state);
      if(this.game==='poker')this.drawPoker(view,a.state);
      if(this.game==='roulette')this.drawRoulette(view,a.state,busy);
      if(this.game==='slots')this.drawSlots(view,a.state,busy);
    }
    this.scene.ui.controls.refresh();
  }
  select(parent,label,items,value,onChange){
    const row=el('label','casino-setting',label+' '),select=el('select');select.setAttribute('aria-label',label);
    for(const [v,t]of items){const option=el('option','',t);option.value=v;select.append(option);}select.value=value;
    select.addEventListener('change',()=>{if(this.locked)return;const focused=document.activeElement===select;onChange(select.value);if(focused)[...this.scene.ui.root.querySelectorAll('select')].find(s=>s.getAttribute('aria-label')===label)?.focus({preventScroll:true});});row.append(select);parent.append(row);return select;
  }
  cards(parent,cards){
    const row=el('div','casino-cards');
    for(const c of cards){const label=c?(typeof c.rank==='number'?cardLabel(c):c.rank+c.suit):'✦';const card=el('span',`casino-card${/[♥♦]/.test(label)?' red':''}${c?'':' back'}`,label);card.setAttribute('aria-label',c?label:'Carte cachée');row.append(card);}parent.append(row);
  }
  drawKarl(parent,pose){const img=el('img','casino-karl');img.src=`${import.meta.env.BASE_URL}assets/casino/karl-${pose}.png`;img.alt='Karl, ton croupier';parent.append(img);}
  drawBlackjack(parent,s){
    const table=el('div','casino-felt blackjack-felt');this.drawKarl(table,s.status==='complete'?3:1);
    const dealer=el('div','casino-hand casino-dealer-hand');dealer.append(el('strong','',`Karl${s.status==='complete'?` · ${blackjackValue(s.dealer).total}`:''}`));this.cards(dealer,s.status==='complete'?s.dealer:[s.dealer[0],null]);table.append(dealer);
    for(const [i,h]of s.hands.entries()){const row=el('div',`casino-hand${s.activeHand===i&&s.status==='playing'?' current':''}`);row.append(el('strong','',`Toi${s.hands.length>1?` · main ${i+1}`:''} · ${blackjackValue(h.cards).total}`));this.cards(row,h.cards);if(h.result)row.append(el('span','casino-hand-result',resultNames[h.result]));table.append(row);}parent.append(table);
  }
  drawProfiles(parent){const group=el('div','casino-profiles');for(const [name,detail,face]of [['Luc','Calme, amateur de bluff','😎'],['Mireille','Prudente, sélective','♠'],['Marco','Bavard, suit souvent','♣']]){const card=el('div','casino-profile');card.append(el('b','',`${face} ${name}`),el('span','',detail));group.append(card);}parent.append(group);}
  drawPoker(parent,state){
    const s=pokerPublicState(state),table=el('div','casino-felt poker-felt');
    table.append(el('div','casino-pot',`${({preflop:'Préflop',flop:'Flop',turn:'Turn',river:'River',showdown:'Dévoilement'})[s.street]??s.street} · Pot ${s.result?.totalPot??s.pot} jetons`));
    this.cards(table,[...s.board,...Array(Math.max(0,5-s.board.length)).fill(null)]);
    const players=el('div','casino-players');
    for(const [i,p]of s.players.entries()){const seat=el('div',`casino-seat${s.turn===i?' current':''}${p.folded?' folded':''}`);seat.append(el('strong','',`${i===1?'😎 ':''}${p.name} · ${p.stack}`));this.cards(seat,p.cards?.length?p.cards:[null,null]);seat.append(el('small','',p.folded?'Couché':p.allIn?'Tapis':`Misé : ${p.streetBet}`));players.append(seat);}table.append(players);parent.append(table);
    const last=s.log?.slice(-2);if(last?.length)parent.append(el('p','casino-log',last.map(l=>l.text).join(' · ')));
    if(state.status==='playing'&&state.turn===0){const legal=pokerActions(state);if(legal.raise){
      this.raiseTo=Math.max(legal.minRaiseTo,Math.min(this.raiseTo||legal.minRaiseTo,legal.maxRaiseTo));
      const label=el('label','casino-setting',`Relancer à ${this.raiseTo} jetons`),input=el('input');input.type='range';input.min=legal.minRaiseTo;input.max=legal.maxRaiseTo;input.step=1;input.value=this.raiseTo;input.setAttribute('aria-label','Total de la relance');
      input.addEventListener('input',()=>{this.raiseTo=Number(input.value);label.firstChild.textContent=`Relancer à ${this.raiseTo} jetons `;});label.append(input);parent.append(label);
    }}
    if(state.result){const winners=state.result.winners;parent.append(el('p','casino-log',`Gagnant${winners.length>1?'s':''} : ${winners.map(w=>typeof w==='number'?`${state.players[w].name}${state.result.hands[w]?` (${state.result.hands[w].name})`:''}`:w.name??w).join(', ')}`));}
  }
  drawRouletteBets(parent){
    const grid=el('div','casino-roulette-grid');
    for(let n=0;n<=36;n++){
      const b=el('button',`roulette-number ${rouletteColor(n)}`,String(n));b.type='button';b.setAttribute('aria-label',`Ajouter 1 jeton sur ${n}`);b.disabled=this.bets.reduce((s,b)=>s+b.amount,0)>=5;
      b.addEventListener('click',()=>{if(!this.locked)this.addBet('number',n);});grid.append(b);
    }parent.append(grid);
    const options=[['color:red','Rouge'],['color:black','Noir'],['parity:even','Pair'],['parity:odd','Impair'],['dozen:1','1 à 12'],['dozen:2','13 à 24'],['dozen:3','25 à 36'],['column:1','Colonne 1'],['column:2','Colonne 2'],['column:3','Colonne 3']];
    this.rouletteChoice??='color:red';this.select(parent,'Mise extérieure',options,this.rouletteChoice,v=>{this.rouletteChoice=v;});
    const desc=b=>`${b.amount}× ${b.type==='number'?b.value:options.find(([v])=>v===`${b.type}:${b.value}`)?.[1]}`;
    parent.append(el('p','casino-bets',this.bets.length?this.bets.map(desc).join(' · '):'Aucune mise engagée.'));
  }
  drawRoulette(parent,s,busy){
    const wheel=el('div',`casino-wheel${busy?' spinning':''}`);wheel.append(el('span','',busy?'●':String(s.number)));parent.append(wheel);
    if(!busy)parent.append(el('p','casino-log',`${s.number} · ${({red:'Rouge',black:'Noir',green:'Zéro'})[s.color]}`));
  }
  drawSlots(parent,s,busy){
    const machine=getSlotMachine(this.options.machineId??'cerises'),cabinet=el('div',`casino-slot-cabinet ${machine.theme}`);cabinet.append(el('strong','',machine.name));
    const reels=el('div',`casino-reels${busy?' spinning':''}`);for(const v of s&&!busy?s.symbols:['sept','sept','sept'])reels.append(el('span','',symbols[v]??v));cabinet.append(reels,el('small','',`1 JETON · LOT MAX ${machine.maxPayout}`));parent.append(cabinet);
  }
  drawSlotRules(parent){
    const m=getSlotMachine(this.options.machineId??'cerises'),table=el('table','casino-paytable');
    const head=el('tr');for(const text of ['Combinaison','Retour','Chance'])head.append(el('th','',text));table.append(head);
    for(const o of m.outcomes){const row=el('tr');for(const text of [o.symbols.map(s=>symbols[s]).join(' '),`${o.payout} jetons`,`${(100*o.weight/m.totalWeight).toLocaleString('fr-CA')} %`])row.append(el('td','',text));table.append(row);}parent.append(table,el('p','casino-log',`Retour théorique à très long terme : ${Math.round(m.rtp*1000)/10} %. Chaque tirage reste indépendant.`));
  }
}
