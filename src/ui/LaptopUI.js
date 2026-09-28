import { careerProfile } from '../game/CareerProfile.js';
import { startAt } from '../game/SceneRouting.js';
import './laptop.css';
import './computer.css';
import { COMPUTER_APPS, computerApp } from './ComputerApps.js';

const action = (id,label,disabled=false)=>({id:`laptop-${id}`,label,disabled});
export class LaptopUI {
  constructor(scene, {drawArt=true, device='laptop'} = {}) {
    this.scene=scene; this.device=device; this.page=null; this.output=''; this.history=[];
    if(!drawArt)return;
    const g=scene.add.graphics().setDepth(560);
    g.fillStyle(0x0c192b).fillRect(67,463,69,43).fillStyle(0x758294).fillRect(65,506,73,9);
    g.fillStyle(0x173e5a).fillRect(72,468,59,31).fillStyle(0x72dcca).fillRect(79,475,16,3).fillRect(79,482,33,3);
    g.lineStyle(2,0xa4b2bd).strokeRect(67,463,69,43); this.art=g;
  }
  get opened(){return this.page!==null;}
  open(page='desktop',message='', {replace=false}={}) {
    if(page==='desktop')this.history=[];
    else if(!replace&&this.page&&page!==this.page)this.history.push(this.page);
    this.history=this.history.slice(-20);
    this.page=page; this.scene.world.releaseControls();
    const profile=careerProfile.snapshot(),test=careerProfile.testStatus().active;
    let title=this.device==='desktop'?'Ton bureau':'Mon laptop',text=test?'SESSION DE TEST · carrière normale conservée':`Jour ${profile.daily.day} · ${profile.wallet.money} $\nInstalle-toi. Tes projets et tes amis sont à portée de clic.`,actions=[];
    if(page==='desktop')actions=[...COMPUTER_APPS.map(app=>action(app.id,app.label)),...(test?[action('normal','Revenir à ma carrière')]:[]),action('close','Éteindre'),action('terminal','>_')];
    if(page==='browser'){title='Internet · Favoris';text='Les services du quartier, depuis chez toi.';actions=[action('marathon','Marathon de Montréal'),action('travel','Voyages · Camps de boxe'),action('news','La vie du quartier'),action('desktop','← Bureau')];}
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
    if(page==='terminal'){title='Terminal';text='';actions=[action('run','Envoyer'),action('desktop','← Bureau')];}
    const app=computerApp(page,profile);
    if(app){title=app.title;text=app.text;actions=app.actions.map(a=>action(a.id,a.label,a.disabled));}
    this.scene.ui.showDialog({speaker:test?'BOXEUR OS · TEST':'BOXEUR OS',title,text:text.trim(),actions});
    const panel=this.scene.ui.root.querySelector('.gym-dialog');panel.classList.add('laptop-window');panel.dataset.page=page;panel.dataset.device=this.device;
    if(!panel.querySelector('.laptop-screen')){
      const screen=document.createElement('div');screen.className='laptop-screen';
      screen.append(panel.querySelector('.gym-dialog-copy'),panel.querySelector('.gym-dialog-actions'));panel.append(screen);
      const device=new URL(`${import.meta.env.BASE_URL}assets/laptop/device.png`,document.baseURI).href;
      panel.style.setProperty('--laptop-device',`url("${device}")`);
      panel.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
    }
    this.decorateDesktop(panel,profile,title);
    const terminal=panel.querySelector('[data-gym-action="laptop-terminal"]');
    terminal?.setAttribute('aria-label','Terminal');
    const reading=panel.querySelector('.gym-dialog-copy');
    reading.querySelector('.terminal-console')?.remove();
    if(page==='terminal'){
      const console=document.createElement('div');console.className='terminal-console';
      const pre=document.createElement('pre');pre.textContent=this.output;pre.setAttribute('aria-live','polite');pre.setAttribute('aria-label','Résultat du terminal');pre.tabIndex=0;
      const form=document.createElement('form');form.autocomplete='off';const label=document.createElement('label');label.textContent='> ';
      const input=document.createElement('input');input.type='text';input.name='commande';input.setAttribute('aria-label','Commande du terminal');input.enterKeyHint='send';input.autocapitalize='none';input.spellcheck=false;input.maxLength=60;label.append(input);form.append(label);
      form.addEventListener('submit',e=>{e.preventDefault();this.execute(input.value);});
      input.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();input.blur();this.open('desktop');}});
      console.append(pre,form);reading.append(console);
      // Keep keyboard closed on phones until the field is deliberately touched.
    }
  }

  decorateDesktop(panel,profile,title) {
    const screen=panel.querySelector('.laptop-screen');
    if(!screen.querySelector('.computer-toolbar')){
      this.toolbarAbort?.abort();this.toolbarAbort=new AbortController();
      const toolbar=document.createElement('nav');toolbar.className='computer-toolbar';toolbar.setAttribute('aria-label','Navigation de l’ordinateur');
      for(const [id,label,name] of [['back','←','Page précédente'],['desktop','⌂','Bureau'],['close','×','Éteindre l’ordinateur']]){
        const button=document.createElement('button');button.type='button';button.dataset.computerNav=id;button.textContent=label;button.setAttribute('aria-label',name);button.title=name;
        button.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button===0)this.scene.ui.menuPointers.set(button,event.pointerId);},{signal:this.toolbarAbort.signal});
        button.addEventListener('pointercancel',()=>this.scene.ui.menuPointers.delete(button),{signal:this.toolbarAbort.signal});
        button.addEventListener('click',event=>{
          if(button.disabled||this.scene.ui.paused||!this.scene.ui.consumeActivation(button,event))return;
          this.scene.ui.clearInputs();this.choose('laptop-'+id);
        },{signal:this.toolbarAbort.signal});
        toolbar.append(button);
      }
      const location=document.createElement('span');location.className='computer-location';toolbar.insertBefore(location,toolbar.lastElementChild);
      screen.prepend(toolbar);
      const taskbar=document.createElement('div');taskbar.className='computer-taskbar';screen.append(taskbar);
    }
    screen.querySelector('[data-computer-nav="back"]').disabled=this.page==='desktop';
    screen.querySelector('[data-computer-nav="desktop"]').disabled=this.page==='desktop';
    screen.querySelector('.computer-location').textContent=title;
    screen.querySelector('.computer-taskbar').textContent='BOXEUR OS  ·  JOUR '+profile.daily.day+'  ·  '+profile.wallet.money+' $';
    for(const app of COMPUTER_APPS){
      const button=panel.querySelector('[data-gym-action="laptop-'+app.id+'"]');
      if(this.page==='desktop'&&button){button.dataset.appIcon=app.icon;button.title=app.detail;}
    }
  }
  choose(id){
    if(!id.startsWith('laptop-'))return false;
    const command=id.slice(7);
    if(command==='close'){this.close();return true;}
    if(command==='back'){this.back();return true;}
    if(command==='normal'){this.execute('retour');return true;}
    if(command==='run'){this.execute(this.scene.ui.root.querySelector('.terminal-console input')?.value??'');return true;}
    if(command==='register'){const r=careerProfile.registerMarathon();this.scene.refreshProfile();this.open('marathon',r.message);return true;}
    if(command.startsWith('reserve-')){const dest=command.slice(8),r=careerProfile.reserveTravel(dest);this.scene.refreshProfile();this.open(dest,r.message);return true;}
    this.open(command);return true;
  }
  execute(text){
    const wasTyping=document.activeElement?.matches('.terminal-console input');
    const r=careerProfile.applyTestCommand(text);
    this.output=`> ${text.trim()}\n${r.message.replace(/\s*Tapez liste[^.]*\.?/g,'')}${r.commands?'\n\n'+r.commands.map(c=>`${c.command} — ${c.description}`).join('\n'):''}`;
    this.scene.refreshProfile();
    if(r.ok&&r.location){
      this.close();
      if(r.opponent){this.scene.changingPlace=true;this.scene.world.pause();this.scene.ui.clearInputs();this.scene.scene.start('SparringScene',{opponent:r.opponent,lesson:'resistance'});}
      else startAt(this.scene,r.location);
    }else {this.open('terminal');if(wasTyping)this.scene.ui.root.querySelector('.terminal-console input')?.focus({preventScroll:true});}
  }
  back(){if(this.page==='desktop')this.close();else this.open(this.history.pop()??({terminal:'desktop',browser:'desktop',cuba:'travel',mexico:'travel',travel:'browser',marathon:'browser'}[this.page]??'desktop'),'',{replace:true});}
  close(){this.page=null;this.history=[];this.toolbarAbort?.abort();const p=this.scene.ui.root.querySelector('.gym-dialog');p.classList.remove('laptop-window');delete p.dataset.page;delete p.dataset.device;p.querySelector('.terminal-console')?.remove();p.querySelector('.computer-toolbar')?.remove();p.querySelector('.computer-taskbar')?.remove();const screen=p.querySelector('.laptop-screen');if(screen){p.append(...screen.children);screen.remove();}this.scene.ui.closeDialog();this.scene.world.releaseControls();}
  destroy(){this.page=null;this.toolbarAbort?.abort();this.art?.destroy();}
}
