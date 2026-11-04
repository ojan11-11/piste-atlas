import assert from 'node:assert/strict';
import {safeURL,sameHost,visibleText,discoverLinks,extractEvidence,robotsAllow,selectPilot} from './lib/resort-research.mjs';

// Safety: do not fetch login-required, private-network or insecure addresses.
assert.equal(safeURL('http://example-resort.com'),null);
assert.equal(safeURL('https://localhost/foo'),null);
assert.equal(safeURL('https://127.0.0.1/'),null);
assert.equal(safeURL('https://some.internal/'),null);
assert.equal(safeURL('https://www.instagram.com/example/'),null);
assert.ok(safeURL('https://www.example-resort.com/mountain'));
assert.ok(sameHost('https://www.example-resort.com','https://example-resort.com/tickets'));
assert.ok(!sameHost('https://example-resort.com','https://other-resort.com'));

const html='<html><nav>Menu </nav><h1>Mountain Overview</h1>'+
 '<p>Skiable Acres: 2,908</p><p>Vertical Drop: 2,550 feet</p>'+
 '<p>Summit Elevation: 11,200 ft</p><p>Base Elevation: 8,650 feet</p>'+
 '<p>Total Lifts: 21</p><p>Trails: 154</p>'+
 '<p>Average Snowfall: 300 inches</p>'+
 '<a href="/mountain/mountain-stats">Mountain Stats</a>'+
 '<a href="/winter-trail-map">Winter Trail Map</a>'+
 '<a href="/tickets/day-tickets">Day Lift Tickets</a>'+
 '<a href="/summer/bike-trail-map">Summer Bike Map</a>'+
 '<a href="https://private-other.com/tickets">Other Site</a></html>';
const links=discoverLinks(html,'https://www.example-resort.com/');
assert.equal(links.stats[0].url,'https://www.example-resort.com/mountain/mountain-stats');
assert.equal(links.map[0].url,'https://www.example-resort.com/winter-trail-map');
assert.equal(links.tickets[0].url,'https://www.example-resort.com/tickets/day-tickets');
assert.ok(!links.map.some(x=>/summer/.test(x.url)));
assert.equal(visibleText('<script>secret</script><p>Visible</p>').includes('secret'),false);

const found=extractEvidence(html,'https://www.example-resort.com/mountain/mountain-stats');
const by=Object.fromEntries(found.map(f=>[f.metric,f]));
assert.equal(by.acres.value,2908);
assert.equal(by.vertical.value,2550);
assert.equal(by.summit.value,11200);
assert.equal(by.base.value,8650);
assert.equal(by.lifts.value,21);
assert.equal(by.trails.value,154);
assert.ok(!found.some(f=>f.metric==='snowfall'),'Snowfall is deliberately deferred');
assert.ok(found.every(f=>f.status==='needs-human-verification'));
assert.ok(found.every(f=>f.sourceUrl.startsWith('https://')));

// robots.txt: longest matching directive, explicit bot group, fail-closed policy in HTTP caller.
const robots='User-agent: *\nDisallow: /private\nAllow: /private/public\nUser-agent: PisteAtlasResearchBot\nDisallow: /login\nAllow: /login/info\n';
assert.equal(robotsAllow(robots,'/login/account'),false);
assert.equal(robotsAllow(robots,'/login/info'),true);
assert.equal(robotsAllow(robots,'/mountain'),true);
assert.equal(robotsAllow('User-agent: *\nDisallow: /\n','/mountain'),false);
assert.equal(robotsAllow('User-agent: *\nDisallow: /private\nAllow: /private/public\n','/private/public/map'),true);
assert.equal(robotsAllow('User-agent: *\nDisallow: /private\n','/private/page'),false);

// Pilot prefers operator-looking HTTP sites, includes US and Canada, excludes already reviewed.
const sample=[
 {id:'one',name:'One',dataQuality:'open-data',country:'United States',regionCode:'UT',website:'https://one-ski.com',mappedLiftCount:9},
 {id:'two',name:'Two',dataQuality:'open-data',country:'United States',regionCode:'UT',website:'https://two-ski.com',mappedLiftCount:2},
 {id:'three',name:'Three',dataQuality:'open-data',country:'United States',regionCode:'CO',website:'https://three-ski.com',mappedLiftCount:5},
 {id:'four',name:'Four',dataQuality:'open-data',country:'Canada',regionCode:'BC',website:'https://four-ski.ca',mappedLiftCount:7},
 {id:'five',name:'Five',dataQuality:'operator-reviewed',country:'Canada',regionCode:'AB',website:'https://five-ski.ca'}
];
const chosen=selectPilot(sample,4);
assert.equal(chosen.length,4);
assert.ok(chosen.some(x=>x.country==='Canada'));
assert.ok(!chosen.some(x=>x.id==='five'));
assert.equal(new Set(chosen.map(x=>x.id)).size,4);
console.log('PASS URL safety, robots allow/disallow, link discovery, mountain-stat candidates and balanced pilot selection');
