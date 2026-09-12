import assert from 'node:assert/strict';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {DELIVERY_STOPS} from '../src/game/ChapterRules.js';
export {CAREER_STORAGE_KEY};
export function hotelFixture(){
 const p=new CareerProfile({storage:null});p.recordFight({opponent:'beton',winner:'player',score:12});p.recordFight({opponent:'kramer',winner:'player',score:15});
 for(let i=0;i<6;i++){if(p.dailyStatus().energy<30)p.sleep();p.startDelivery();for(const id of DELIVERY_STOPS)p.deliverParcel(id,{tip:2});}
 p.sleep();assert.equal(p.startTournament().ok,true);return p;
}
export async function isolateVite(context){await context.routeWebSocket('**',ws=>{const server=ws.connectToServer();server.onMessage(m=>{if(typeof m==='string'&&(/"type":"(?:update|full-reload)"/.test(m)))return;ws.send(m);});});}
export async function seedContext(context,profile){await isolateVite(context);await context.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,seed);},{key:CAREER_STORAGE_KEY,seed:profile.exportText()});}
