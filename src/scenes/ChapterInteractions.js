import { careerProfile } from '../game/CareerProfile.js';
import { MEDAL_LABELS } from '../game/ChapterRules.js';
import { DISTRICT_ARRIVALS } from '../game/DistrictWorld.js';
import './chapter.css';

const close = {id:'close',label:'Continuer →'};
const show=(scene,title,text,actions=[close],speaker='LA VIE DE QUARTIER')=>scene.ui.showDialog({speaker,title,text,actions});
export function chapterTravel(scene,place,from=scene.place){
  scene.persistLocation();scene.changingPlace=true;scene.ui.clearInputs();scene.world.pause();
  const position=place==='neighborhood'?{x:145,y:715,facing:'right'}:DISTRICT_ARRIVALS[place]?.[from]??{x:640,y:615,facing:'up'};
  careerProfile.setLocation({scene:place,...position});
  scene.scene.start('ExplorationScene',{place,location:position});
}
export function showEquipment(scene,slot='street',message=''){
  const p=careerProfile.snapshot(),items=careerProfile.catalogue(slot==='street'?'clothing':'boxing');
  show(scene,slot==='street'?'Ta garde-robe':'Ton casier',`${message}${message?'\n\n':''}Choisis une tenue achetée. ${slot==='street'?'Ta tuque rouge reste ta signature.':'La tenue de compétition est fournie au tournoi.'}`,
    [...items.filter(item=>p.inventory.owned.includes(item.id)).map(item=>({id:`equip-${item.id}`,label:`${p.inventory.equipped[slot]===item.id?'✓ ':''}${item.label}`,disabled:p.inventory.equipped[slot]===item.id})),close],slot==='street'?'CHEZ TOI':'AU GYM');
}
export function showShop(scene,message=''){
  const shop=scene.place==='clothing-shop'?'clothing':'boxing',p=careerProfile.snapshot(),wallet=careerProfile.moneyStatus();
  show(scene,shop==='clothing'?'Rue Nord':'Le Coin Bleu',`${message}${message?'\n\n':''}${wallet.money} $ · plafond ${wallet.cap} $.\n${shop==='clothing'?'Choisis ensuite ta tenue à la maison.':'Équipe ensuite tes articles au casier du gym.'}\nLes collections changent ton apparence.`,
    [...careerProfile.catalogue(shop).map(item=>({id:`buy-${item.id}`,label:`${item.label} · ${p.inventory.owned.includes(item.id)?'Déjà acheté':`${item.price} $`}`,disabled:p.inventory.owned.includes(item.id)||wallet.money<item.price})),close],'BOUTIQUE');
}
function showDepot(scene,message=''){
  const {active}=careerProfile.deliveryStatus(),p=careerProfile.snapshot();
  const touch=scene.ui.controlsQuery.matches;
  const intro=`${message}${message?'\n\n':''}Le vélo est prêté pour ta tournée. Trois adresses, 5 $ par colis livré et jusqu’à 2 $ de pourboire. Coût de départ : 30 énergie.\n${touch?'Joypad pour rouler; A':'Flèches ou WASD pour rouler; E'} à la porte indiquée. Les pauses arrêtent le chrono du pourboire.`;
  show(scene,'Le dépôt des livreurs',active?`${message}\nTournée en cours : ${active.completed.length}/3 livraisons. Les colis suivants t’attendent.`:intro,
    active?[{id:'close',label:'Continuer la tournée →'},{id:'abandon-delivery',label:'Rendre le vélo et arrêter'}]:[
      {id:'start-delivery',label:`Prendre une tournée · 30 énergie`,disabled:p.daily.energy<30||Boolean(p.tournament.active)},close],'LIVRAISONS À VÉLO');
}
function showFights(scene,message=''){
  const p=careerProfile.snapshot(),entry=careerProfile.canStartTournament();
  const next=!p.fights.beton.wins?'Prochain défi : Béton.':!p.fights.kramer.wins?'Béton vaincu. Prochain défi : Kramer.':'Béton et Kramer vaincus. Prochaine étape : les Gants de bronze.';
  show(scene,'La salle de boxe',`${message}${message?'\n\n':''}${next}\nBéton → Kramer → Quart → Demi → Finale. Chaque victoire ouvre la suite.\n${entry.message??''}`,
    [{id:'meet-beton',label:p.fights.beton.wins?'Revanche contre Béton →':'Affronter Béton →'},{id:'meet-kramer',label:p.fights.kramer.wins?'Revanche contre Kramer →':p.fights.beton.wins?'Affronter Kramer →':'Kramer · gagne contre Béton',disabled:!p.fights.beton.wins},
      p.tournament.active?{id:'resume-tournament',label:'Rejoindre le tournoi →'}:{id:'register-tournament',label:`Gants de bronze · ${p.tournament.entries?60:120} $`,disabled:!entry.ok},close],'LES RENCONTRES');
}
export function chapterInteract(scene,station){
  const id=station.id;
  if(id==='to-residential'){chapterTravel(scene,'residential','neighborhood');return true;}
  if(id==='return-neighborhood'){chapterTravel(scene,'neighborhood');return true;}
  if(id==='to-commercial'){chapterTravel(scene,'commercial','residential');return true;}
  if(id==='return-residential'){chapterTravel(scene,'residential','commercial');return true;}
  if(id==='clothing-store'||id==='boxing-store'){chapterTravel(scene,id==='clothing-store'?'clothing-shop':'boxing-shop');return true;}
  if(id==='shop-exit'){chapterTravel(scene,'commercial');return true;}
  if(id==='counter'){showShop(scene);return true;}
  if(id==='wardrobe'||id==='locker'){showEquipment(scene,id==='wardrobe'?'street':'boxing');return true;}
  if(id==='depot'){scene.returningBike=false;showDepot(scene);return true;}
  if(id==='fight'){showFights(scene);return true;}
  if(id==='medals'){
    const medals=careerProfile.snapshot().tournament.medals;
    show(scene,'Tes Gants de bronze',medals.length?medals.map(m=>`Édition ${m.tournamentId} · ${MEDAL_LABELS[m.type]} · Jour ${m.day}`).join('\n'):'Ta première médaille trouvera sa place ici. Gagne contre Kramer puis prépare ton inscription aux Gants de bronze.',[close],'CHEZ TOI');return true;
  }
  if(id==='shop'){
    show(scene,'Le dépanneur du coin','Les livraisons partent du dépôt de la nouvelle rue. Rejoins le passage ouvert à gauche du quartier pour travailler à vélo, puis découvre la place commerçante.',[close]);return true;
  }
  if(id.startsWith('maison-')){
    const {active}=careerProfile.deliveryStatus();
    if(!active){show(scene,'Une adresse de livraison','Récupère une tournée au dépôt avant de livrer ici.');return true;}
    const target=active.stops[active.completed.length];
    if(target!==id){show(scene,'Le prochain colis',`Cette livraison est destinée au ${target.split('-')[1]}. Suis l’adresse de ta tournée.`);return true;}
    const tip=(scene.deliveryClock??0)<35&&!(scene.deliveryBumps>0)?2:(scene.deliveryClock??0)<60?1:0;
    const result=careerProfile.deliverParcel(id,{tip});scene.deliveryClock=0;scene.deliveryBumps=0;
    scene.refreshProfile();
    const left=careerProfile.deliveryStatus().active;
    show(scene,left?'Merci pour le colis !':'Tournée terminée !',result.ok?`Livraison au ${id.split('-')[1]} : ${result.paid} $ reçus${result.capped?' · plafond atteint':` (dont ${tip} $ de pourboire)`}.\n${left?`Prochaine adresse : ${left.stops[left.completed.length].split('-')[1]}.`:'Retourne au dépôt pour rendre le vélo et prendre une autre tournée.'}\nPortefeuille : ${careerProfile.moneyStatus().money} $.`:result.message,[close],'LIVRAISON');
    if(result.ok&&!left)scene.returningBike=true;
    return true;
  }
  if(id.startsWith('closed-')){show(scene,'Ouverture à venir','Ce commerce est encore fermé. Rue Nord et Le Coin Bleu t’accueillent déjà sur la place.');return true;}
  return false;
}
export function chapterChoose(scene,id){
  if(id.startsWith('equip-')){const item=id.slice(6),slot=item.startsWith('street-')?'street':'boxing',r=careerProfile.equipItem(item,slot==='street'?'home':'gym');scene.refreshProfile?.();showEquipment(scene,slot,r.message);return true;}
  if(id.startsWith('buy-')){
    const item=careerProfile.catalogue().find(i=>i.id===id.slice(4));if(!item)return true;
    show(scene,'Confirmer cet achat ?',`${item.label} · ${item.price} $.\nSolde après achat : ${careerProfile.moneyStatus().money-item.price} $.`,[{id:'shop-back',label:'Pas maintenant'},{id:`confirm-buy-${item.id}`,label:'Acheter'}],'BOUTIQUE');return true;
  }
  if(id==='shop-back'){showShop(scene);return true;}
  if(id.startsWith('confirm-buy-')){const r=careerProfile.buyItem(id.slice(12));scene.refreshProfile();showShop(scene,r.message);return true;}
  if(id==='start-delivery'){
    const tours=careerProfile.deliveryStatus().completedTours,orders=[['maison-12','maison-24','maison-36'],['maison-36','maison-12','maison-24'],['maison-24','maison-36','maison-12']];
    const r=careerProfile.startDelivery(orders[tours%3]);scene.deliveryClock=0;scene.deliveryBumps=0;scene.refreshProfile();
    if(r.ok){scene.returningBike=false;scene.ui.closeDialog();scene.world.releaseControls();}else showDepot(scene,r.message);return true;
  }
  if(id==='abandon-delivery'){show(scene,'Arrêter la tournée ?','Les livraisons déjà payées restent acquises. L’énergie du départ reste dépensée.',[{id:'close',label:'Continuer à livrer'},{id:'confirm-abandon',label:'Rendre le vélo'}]);return true;}
  if(id==='confirm-abandon'){careerProfile.abandonDelivery();scene.refreshProfile();showDepot(scene,'Vélo rendu.');return true;}
  if(id==='meet-beton'||id==='meet-kramer'){
    scene.persistLocation();scene.changingPlace=true;scene.ui.clearInputs();scene.world.pause();scene.scene.start('SparringScene',{opponent:id.slice(5),lesson:'resistance'});return true;
  }
  if(id==='register-tournament'){
    const p=careerProfile.snapshot();show(scene,'Partir aux Gants de bronze ?',`Inscription : ${p.tournament.entries?60:120} $. Hôtel et installations inclus pour les trois jours.\nQuart, demi, finale : un combat par jour, puis retour au lit. Tes tenues de compétition sont fournies.`,[{id:'close',label:'Pas encore'},{id:'confirm-tournament',label:'Payer et rejoindre l’hôtel →'}],'LES GANTS DE BRONZE');return true;
  }
  if(id==='confirm-tournament'||id==='resume-tournament'){
    const result=id==='resume-tournament'?{ok:true}:careerProfile.startTournament();
    if(!result.ok){showFights(scene,result.message);return true;}
    scene.changingPlace=true;scene.ui.clearInputs();scene.world.pause();scene.scene.start('HotelScene',{place:'hotel-room'});return true;
  }
  return false;
}
export function installChapterReadout(scene){
  scene.chapterReadout=document.createElement('div');scene.chapterReadout.className='chapter-readout';scene.chapterReadout.setAttribute('role','status');
  scene.ui.root.append(scene.chapterReadout);
}
export function updateChapterReadout(scene){
  const p=careerProfile.snapshot(),run=p.delivery.active,target=run?.stops[run.completed.length];
  const text=run?`VÉLO · ${run.completed.length}/3 · Prochain colis : ${target.split('-')[1]} · ${p.wallet.money} $`:`${p.wallet.money} $ · ${scene.place==='residential'?'Dépôt et trois adresses':scene.place==='commercial'?'Deux boutiques ouvertes':p.tournament.active?'Gants de bronze · séjour en cours':'Épargne pour les Gants de bronze'}`;
  if(scene.chapterReadout&&scene.chapterReadout.textContent!==text)scene.chapterReadout.textContent=text;
}
