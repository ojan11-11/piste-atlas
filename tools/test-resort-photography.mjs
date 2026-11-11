// Piste Atlas photo quality and licensing regression checks (no network).
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const win={RESORTS:[
  {id:'big-sky',name:'Big Sky Resort'},
  {id:'osd-wikidata-q12053500',name:'Breckenridge Ski Resort',wikidataID:'Q12053500'},
  {id:'unknown',name:'Afton Alps'},
  {id:'ambiguous',name:'Black Mountain'}
]};
const doc={querySelectorAll:()=>[],querySelector:()=>null};
const sandbox={window:win,document:doc,URLSearchParams,AbortController,setTimeout,clearTimeout,
  fetch:()=>{throw Error('Network access must not occur in static tests');}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('atlas-photos.js','utf8'),sandbox);
const {featured,_test:t}=win.PisteAtlasPhotos;
assert.ok(Object.keys(featured).length>=15,'At least fifteen editorial resort sets');
for(const [id,entry] of Object.entries(featured)){
  assert.ok(entry.category && entry.files.length>=2,'Resort '+id+' has gallery candidates');
  assert.ok(entry.files.every(x=>/\.(?:jpe?g|webp)$/i.test(x)),'Resort '+id+' has photographic file candidates');
}
const base={
  title:'File:Big Sky Resort skiing in fresh snow.jpg',
  imageinfo:[{
    url:'https://upload.wikimedia.org/wikipedia/commons/a/aa/ski.jpg',
    thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/ski.jpg/1440px-ski.jpg',
    width:4000,height:3000,
    extmetadata:{Artist:{value:'<a href="#">Mountain Photographer</a>'},
      LicenseShortName:{value:'CC BY-SA 4.0'},
      LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'}}
  }]
};
const img=t.normalizePhoto(base);
assert.ok(img,'CC BY-SA photo accepted');
assert.equal(img.author,'Mountain Photographer');
assert.ok(t.srcset(img).includes('480px-ski.jpg 480w'),'Responsive Commons source sets generated');
assert.equal(t.normalizePhoto({...base,imageinfo:[{...base.imageinfo[0],
  extmetadata:{LicenseShortName:{value:'All rights reserved'}}}]}),null,
  'All-rights-reserved photo blocked');
assert.equal(t.normalizePhoto({...base,imageinfo:[{...base.imageinfo[0],width:400,height:300}]}),null,
  'Low-resolution images blocked');
const winter={file:'Beautiful snow mountain skiing panorama.jpg',width:4200,height:2700,featured:false};
const summer={file:'Summer mountain biking July 2024.jpg',width:4200,height:2700,featured:false};
const logo={file:'Resort logo.jpg',width:4200,height:2700,featured:false};
const picks=t.ranked([summer,logo,winter],8);
assert.equal(picks.length,1,'Winter scenery selected over unrelated/seasonally incorrect images');
assert.equal(picks[0].file,winter.file);
assert.equal(t.categoryFor({id:'big-sky',name:'Big Sky Resort'},null),'Big Sky Resort');
assert.equal(t.categoryFor({id:'ambiguous',name:'Black Mountain'},null),null,
  'Ambiguous place names never produce category guesses');
assert.equal(t.exactResortFilename({name:'Afton Alps'},'Afton Alps skiing powder.jpg'),true);
assert.equal(t.exactResortFilename({name:'Afton Alps'},'Rocky Mountain skiing powder.jpg'),false,
  'Unrelated images cannot match resort-name search');
assert.equal(t.exactResortFilename({name:'Black Mountain'},'Black Mountain Ski Resort.jpg'),true);
assert.equal(t.exactResortFilename({name:'Black Mountain'},'White Mountain Ski Resort.jpg'),false);
console.log('PASS: curated photo sets, Commons licenses, size, winter ranking, exact matching, and srcsets.');
