import { careerProfile } from '../game/CareerProfile.js';
import { startAt } from '../game/SceneRouting.js';
import './laptop.css';

const action = (id,label,disabled=false)=>({id:`laptop-${id}`,label,disabled});
export class LaptopUI {
  constructor(scene) {
    this.scene=scene; this.page=null; this.output='Tape liste pour connaître les commandes.';
    const g=scene.add.graphics().setDepth(560);
    g.fillStyle(0x0c192b).fillRect(67,463,69,43).fillStyle(0x758294).fillRect(65,506,73,9);
    g.fillStyle(0x173e5a).fillRect(72,468,59,31).fillStyle(0x72dcca).fillRect(79,475,16,3).fillRect(79,482,33,3);
    g.lineStyle(2,0xa4b2bd).strokeRect(67,463,69,43); this.art=g;
  }
  get opened(){return this.page!==null;}
  open(page='desktop',message='') {
    this.page=page; this.scene.world.releaseControls();
    const profile=careerProfile.snapshot(),test=careerProfile.testStatus().active;
    let title='Mon laptop',text=test?'SESSION DE TEST · carrière normale conservée':'BOXEUR OS · Connexion locale',actions=[];
    if(page==='desktop')actions=[action('browser','▣ Navigateur'),action('terminal','>_ Terminal'),...(test?[action('normal','Revenir à ma carrière')]:[]),action('close','Éteindre')];
    if(page==='browser'){title='Internet · Favoris';text='Les services du quartier, depuis chez toi.';actions=[action('marathon','Marathon de Montréal'),action('travel','Voyages · Camps de boxe'),action('desktop','← Bureau')];}
    if(page==='travel'){title='Voyages · Camps de boxe';text=`${message}\n${profile.wallet.money} $ · Logement et retour inclus. Réserve ici, puis prends le métro pour l’aéroport.`;actions=['cuba','mexico'].map(id=>action(id,id==='cuba'?'Cuba · Louisto · 160 $':'Mexique · Pablo et Danielo · 160 $'));actions.push(action('browser','← Favoris'));}
    if(['cuba','mexico'].includes(page)){
      const offer=careerProfile.travelOffer(page),reserved=careerProfile.travelStatus(page).reserved;
      title=page==='cuba'?'Cuba · Le gym aux pneus':'Mexique · La côte et les arènes';
      text=`${message}\n${reserved?'Billet réservé.':'Séjour : 160 $ · logement, gym et retour inclus.'}\n${offer.message}\nDépart physique à l’aéroport. ${page==='cuba'?'Louisto t’attend sur la plage.':'Entraîne-toi avec Pablo et affronte Danielo.'}`;
      actions=[action(`reserve-${page}`,reserved?'Billet déjà réservé':'Réserver · 160 $',!offer.ok),action('travel','← Voyages')];
    }
    if(page==='marathon'){
      const m=careerProfile.marathonStatus(),offer=careerProfile.marathonOffer();
      title='Marathon de Montréal';text=`${message}\n100 $ par inscription. Course facultative, sans prix en argent. Une médaille souvenir à ta première arrivée.\nÎle → centre-ville → Vieux-Port → stade. Métro de l’Île au départ, métro du Stade pour rentrer.\n${m.active?'Inscription en cours : rejoins le départ sur l’île.':offer.message}`;
      actions=[action('register',m.active?'Déjà inscrit':'M’inscrire · 100 $',!offer.ok),action('browser','← Favoris')];
    }
    if(page==='terminal'){title='Terminal';text='Les commandes de test ouvrent une sauvegarde séparée. « retour » retrouve ta carrière.';actions=[action('run','Envoyer'),action('liste','liste · Aide'),action('desktop','← Bureau')];}
    this.scene.ui.showDialog({speaker:test?'LAPTOP · TEST':'LAPTOP',title,text:text.trim(),actions});
    const panel=this.scene.ui.root.querySelector('.gym-dialog');panel.classList.add('laptop-window');panel.dataset.page=page;
    const reading=panel.querySelector('.gym-dialog-copy');
    reading.querySelector('.terminal-console')?.remove();
    if(page==='terminal'){
      const console=document.createElement('div');console.className='terminal-console';
      const pre=document.createElement('pre');pre.textContent=this.output;pre.setAttribute('aria-live','polite');pre.setAttribute('aria-label','Résultat du terminal');pre.tabIndex=0;
      const form=document.createElement('form');form.autocomplete='off';const label=document.createElement('label');label.textContent='> ';
      const input=document.createElement('input');input.type='text';input.name='commande';input.setAttribute('aria-label','Commande du terminal');input.enterKeyHint='send';input.placeholder='liste';input.autocapitalize='none';input.spellcheck=false;input.maxLength=60;label.append(input);form.append(label);
      form.addEventListener('submit',e=>{e.preventDefault();this.execute(input.value);});
      input.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();input.blur();this.open('desktop');}});
      console.append(pre,form);reading.append(console);
      // Keep keyboard closed on phones until the field is deliberately touched.
    }
  }
  choose(id){
    if(!id.startsWith('laptop-'))return false;
    const command=id.slice(7);
    if(command==='close'){this.close();return true;}
    if(command==='normal'){this.execute('retour');return true;}
    if(command==='run'){this.execute(this.scene.ui.root.querySelector('.terminal-console input')?.value??'');return true;}
    if(command==='liste'){this.execute('liste');return true;}
    if(command==='register'){const r=careerProfile.registerMarathon();this.scene.refreshProfile();this.open('marathon',r.message);return true;}
    if(command.startsWith('reserve-')){const dest=command.slice(8),r=careerProfile.reserveTravel(dest);this.scene.refreshProfile();this.open(dest,r.message);return true;}
    this.open(command);return true;
  }
  execute(text){
    const wasTyping=document.activeElement?.matches('.terminal-console input');
    const r=careerProfile.applyTestCommand(text);
    this.output=`> ${text.trim()}\n${r.message}${r.commands?'\n\n'+r.commands.map(c=>`${c.command} — ${c.description}`).join('\n'):''}`;
    this.scene.refreshProfile();
    if(r.ok&&r.location){
      this.close();
      if(r.opponent){this.scene.changingPlace=true;this.scene.world.pause();this.scene.ui.clearInputs();this.scene.scene.start('SparringScene',{opponent:r.opponent,lesson:'resistance'});}
      else startAt(this.scene,r.location);
    }else {this.open('terminal');if(wasTyping)this.scene.ui.root.querySelector('.terminal-console input')?.focus({preventScroll:true});}
  }
  back(){if(this.page==='desktop')this.close();else this.open({terminal:'desktop',browser:'desktop',cuba:'travel',mexico:'travel',travel:'browser',marathon:'browser'}[this.page]??'desktop');}
  close(){this.page=null;const p=this.scene.ui.root.querySelector('.gym-dialog');p.classList.remove('laptop-window');delete p.dataset.page;p.querySelector('.terminal-console')?.remove();this.scene.ui.closeDialog();this.scene.world.releaseControls();}
  destroy(){this.page=null;this.art?.destroy();}
}
