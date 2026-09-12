import test from 'node:test';import assert from 'node:assert/strict';
import {hotelBoard} from '../src/game/HotelBoard.js';
const board=(results=[],medal=null)=>hotelBoard({active:{results,medal}});
test('the first day shows eight participants without announcing future winners',()=>{
 const text=board();for(const name of ['Toi','Marco Bellini','Louis Fortin','Émile Bouchard','André Gagnon','Maxime Roy','Alex Nguyen','David Santos'])assert.ok(text.includes(name));assert.ok(!text.includes('✓'));
});
test('qualification fills the next matchup and records the final gold',()=>{
 const first=board([{day:1,winner:'player'}]);assert.match(first,/Toi ✓ — Marco Bellini/);assert.match(first,/Toi — Louis Fortin · à venir/);
 const final=board([{day:1,winner:'player'},{day:2,winner:'player'},{day:3,winner:'player'}],'gold');assert.match(final,/Toi ✓ — André Gagnon/);assert.match(final,/Médaille d’or/);
});
test('an eliminated player is not kept in future pairings',()=>{
 const q=board([{day:1,winner:'remi'}],'participation');assert.match(q,/Marco Bellini — Louis Fortin · à venir/);
 const semi=board([{day:1,winner:'player'},{day:2,winner:'remi'}],'bronze');assert.match(semi,/Louis Fortin — André Gagnon · à venir/);assert.match(semi,/Médaille de bronze/);
});
