// Historical IDs retain their exact doors so saved tours never lose a parcel.
export const DELIVERY_ADDRESSES = Object.freeze({
  'maison-12': {address:'12, rue des Érables', place:'residential', sector:'Rue des Érables', x:441, y:478.5},
  'maison-24': {address:'24, rue des Érables', place:'residential', sector:'Rue des Érables', x:1189.5, y:478.5},
  'maison-36': {address:'36, rue des Érables', place:'residential', sector:'Rue des Érables', x:1942.5, y:478.5},
  'depanneur-84': {address:'84, avenue du Gym · Dépanneur', place:'neighborhood', sector:'Quartier du gym', x:1642.5, y:1309.5},
  'rue-nord-210': {address:'210, promenade du Nord · Rue Nord', place:'commercial', sector:'Place commerçante', x:1096.5, y:465},
});
export function deliveryAddress(id) { return DELIVERY_ADDRESSES[id] ?? {address:id,sector:'Adresse de la tournée'}; }
export function routeDirection(place, target) {
  if(place===target.place)return 'Repère doré sur cette rue';
  if(place==='residential')return target.place==='neighborhood'?'À l’est → quartier du gym':'À l’ouest ← place commerçante';
  if(place==='neighborhood')return 'À l’ouest ← rue des Érables';
  if(place==='commercial')return 'À l’est → rue des Érables';
  if(place.endsWith('-shop'))return 'Sors de la boutique';
  if(place==='home'||place==='gym')return 'Sors dans le quartier';
  if(place==='riverside'||place==='metro-riverside')return 'Métro → station du Quartier';
  return 'Sortie → quartier du gym';
}
