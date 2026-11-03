// Generate portable JSON + CSV from the single source of truth, data/resorts.js
import fs from 'node:fs';
import vm from 'node:vm';
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('data/resorts.js','utf8'),sandbox);
const rows=sandbox.window.RESORTS;
fs.writeFileSync('data/resorts.seed.json',JSON.stringify(rows,null,2)+'\n');
const cols=['id','name','city','region','regionCode','country','lat','lng','area','pass','acres','vertical','snowfall','lifts','trails','summit','base','mapUrl','ticketUrl','sourceUrl'];
const cell=x=> '"'+(x===null||x===undefined?'':String(x)).replaceAll('"','""')+'"';
fs.writeFileSync('data/resorts.seed.csv',cols.join(',')+'\n'+rows.map(r=>cols.map(k=>cell(r[k])).join(',')).join('\n')+'\n');
console.log('Exported',rows.length,'resorts to JSON/CSV');
