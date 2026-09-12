// A small pixel display on the trophy shelf. The full, saved collection remains
// readable by interacting with it, including previous editions of the event.
export function addMedalDisplay(scene, medals) {
  if (!medals.length) return;
  const distinct = ['gold', 'silver', 'bronze', 'participation'].filter(type => medals.some(m => m.type === type));
  const colors = { gold: [0xf7da79,0xb77d2e], silver: [0xdbe5ee,0x758d9a], bronze: [0xe1a16a,0x855237], participation: [0xb9d6db,0x547c86] };
  const art = scene.add.graphics().setDepth(366);
  distinct.forEach((type,i) => {
    const x=1210+(i%2)*22, y=283+Math.floor(i/2)*33;
    art.fillStyle(0x201c20, .95).fillRect(x-2,y-2,21,31);
    art.fillStyle(0xab6844).fillRect(x-1,y-1,19,29);
    art.fillStyle(0x263943).fillRect(x,y,17,27);
    art.fillStyle(0x316eac).fillRect(x+3,y+2,4,10);
    art.fillStyle(0xd6574f).fillRect(x+10,y+2,4,10);
    const [light,dark]=colors[type];
    art.fillStyle(dark).fillRect(x+4,y+12,10,12).fillRect(x+2,y+14,14,8);
    art.fillStyle(light).fillRect(x+5,y+13,8,8).fillRect(x+4,y+15,10,4);
    art.fillStyle(0xfff1c4).fillRect(x+5,y+14,3,2);
    art.fillStyle(dark).fillRect(x+8,y+16,2,4);
  });
  scene.medalDisplay = art;
}
