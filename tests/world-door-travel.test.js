import test from 'node:test';
import assert from 'node:assert/strict';
import { DoorTravel, doorway } from '../src/game/DoorTravel.js';
import { CareerProfile } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';
import { deliveryAddress } from '../src/game/DeliveryRoute.js';

test('doors require an intentional approach, never a stationary load, paused frame or held arrival key', () => {
  const doors=[doorway('exit',100,200,100,30,'up')];
  const travel=new DoorTravel(doors,{x:150,y:210});
  assert.equal(travel.update({x:150,y:210},{y:-1}),null,'Loaded on threshold does not bounce');
  travel.update({x:150,y:280},{y:1});
  assert.equal(travel.update({x:150,y:220},{y:-1},true),null,'Paused movement cannot travel');
  assert.equal(travel.update({x:150,y:220},{y:0}),null,'Standing near a door is insufficient');
  assert.equal(travel.update({x:150,y:220},{y:1}),null,'Moving away cannot enter');
  assert.equal(travel.update({x:150,y:220},{y:-1}),'exit');
  assert.equal(travel.update({x:150,y:220},{y:-1}),null,'No second transition while input remains held');
  travel.update({x:150,y:280},{y:1});
  assert.equal(travel.update({x:150,y:220},{y:-1}),'exit','A fresh approach rearms the same door');
});

test('the current tour visits three sectors and preserves the original three-door route on reload', () => {
  assert.equal(new Set(DELIVERY_STOPS.map(id=>deliveryAddress(id).place)).size,3);
  const old=new CareerProfile({storage:null});
  assert.equal(old.startDelivery(['maison-24','maison-36','maison-12']).ok,true);
  assert.equal(old.deliverParcel('maison-24',{tip:2}).ok,true);
  const restored=new CareerProfile({storage:null});restored.importText(old.exportText());
  assert.equal(restored.deliveryStatus().nextStop,'maison-36');
  assert.equal(deliveryAddress('maison-36').place,'residential');
  for(const stop of ['maison-36','maison-12'])assert.equal(restored.deliverParcel(stop,{tip:1}).ok,true);
  assert.equal(restored.dailyStatus().energy,70);
  assert.equal(restored.moneyStatus().money,19);
  assert.equal(restored.deliverParcel('maison-12').ok,false);
});
