const positions = [[12.667, 38.667], [38.667, 38.667], [47.333, 12.667]];

function drawMap() {
  const tile = 520 / 6;
  let artwork = '<rect x="35" y="35" width="530" height="530" rx="18" fill="#fff4df" stroke="#42665a" stroke-width="6"/>';
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      artwork += `<rect x="${42+col*tile}" y="${42+row*tile}" width="${tile-4}" height="${tile-4}" rx="8" fill="${(row+col)%2?'#e5dfb8':'#f2e4be'}"/>`;
    }
  }
  const tree = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 15v25" stroke="#9d7852" stroke-width="9"/><circle cx="-9" cy="2" r="18" fill="#78a576"/><circle cx="9" cy="-9" r="21" fill="#5d976b"/><circle cx="14" cy="15" r="12" fill="#91b781"/></g>`;
  const house = (x,y,color,roof) => `<g transform="translate(${x} ${y})"><rect x="-31" y="-17" width="62" height="58" rx="3" fill="${color}" stroke="#6e6450" stroke-width="3"/><path d="M-38-16 0-49 38-16z" fill="${roof}" stroke="#6e6450" stroke-width="3"/><rect x="-19" y="-5" width="12" height="16" fill="#fff1b7"/><rect x="8" y="-5" width="12" height="16" fill="#fff1b7"/><path d="M-4 41V16h15v25" fill="#7c715c"/><path d="M-34 42h68" stroke="#bcaa84" stroke-width="5"/></g>`;
  artwork += house(89,94,'#d8b49a','#a87567') + house(179,87,'#b2bd9a','#668471') + house(270,96,'#e4c9a3','#b68169');
  artwork += tree(80,249,0.8)+tree(78,515,0.72)+tree(519,505,0.83)+tree(522,292,0.72);
  for (const [x,y] of [[214,249],[341,249],[430,516]]) {
    artwork += `<g transform="translate(${x} ${y})"><rect x="-26" y="-7" width="52" height="10" rx="3" fill="#a7835b"/><path d="M-20 4v9m40-9v9" stroke="#7d7258" stroke-width="4"/></g>`;
  }
  for (const [x,y] of [[260,515],[521,214]]) {
    artwork += `<g transform="translate(${x} ${y})"><rect x="-24" y="-12" width="48" height="24" rx="4" fill="#b9a47e"/><path d="M-17 5v-13m17 13v-16m17 16v-11" stroke="#73936d" stroke-width="4"/><circle cx="-17" cy="-9" r="7" fill="#dca38f"/><circle cx="0" cy="-13" r="8" fill="#dec374"/><circle cx="17" cy="-8" r="7" fill="#d9adb0"/></g>`;
  }
  artwork += positions.map(([x,y],i)=>`<rect x="${x*10-85.5}" y="${y*10-85.5}" width="171" height="171" rx="9" fill="#fff3da" stroke="#af9e74" stroke-width="2" stroke-dasharray="7 5"/><text x="${x*10}" y="${y*10+7}" text-anchor="middle" font-family="Microsoft YaHei" font-size="19" fill="#b5aa87">${i+1} 贴建筑</text>`).join('');
  return artwork;
}

module.exports = { positions, drawMap };
