// Piste Atlas: quality audit of research-only candidates. No auto-publication.
import fs from 'node:fs';
const input=process.argv[2]||'reports/enrichment-pilot.json';
if(!input.startsWith('reports/')||!fs.existsSync(input))throw Error('Missing pilot report');
const report=JSON.parse(fs.readFileSync(input,'utf8'));
const risks=[],byMetric={};
for(const resort of report.resorts){
 const candidates=resort.statisticCandidates||[],groups=new Map();
 for(const row of candidates){
  if(!groups.has(row.metric))groups.set(row.metric,new Set());
  groups.get(row.metric).add(row.value+' '+row.unit);
  byMetric[row.metric]=(byMetric[row.metric]||0)+1;
  const excerpt=String(row.evidence||'').toLowerCase();
  if(row.metric==='acres'&&/\b(?:forest|land|property|private|golf|village|residential|real estate)\b/.test(excerpt))
   risks.push({resort:resort.name,region:resort.regionCode,kind:'context-not-necessarily-skiable',metric:row.metric,sourceUrl:row.sourceUrl,example:row.evidence.slice(0,145)});
  if(row.metric==='trails'&&/\btotal trails\s*:\s*[0-9]+\s*%/.test(excerpt))
   risks.push({resort:resort.name,region:resort.regionCode,kind:'possible-percent-as-run-count',metric:row.metric,sourceUrl:row.sourceUrl,example:row.evidence.slice(0,145)});
 }
 for(const [metric,values] of groups)if(values.size>1)
  risks.push({resort:resort.name,region:resort.regionCode,kind:'conflicting-values-in-sourced-pages',metric,values:[...values]});
 if(/(?:\bclub\b|\bprivate\b)/i.test(resort.name))
  risks.push({resort:resort.name,region:resort.regionCode,kind:'public-access-needs-verification',metric:null});
}
const stats={resorts:report.resorts.length,researched:report.summary.researched,failed:report.summary.unavailable,
 candidateNumbers:report.summary.statisticCandidates,mapLinks:report.summary.mapPageCandidates,ticketLinks:report.summary.ticketPageCandidates,
 flaggedRisks:risks.length,byMetric,snowfallDeferred:true,automaticallyPublished:0};
const detailed={generatedAt:new Date().toISOString(),status:'review-only',stats,risks};
fs.writeFileSync('reports/enrichment-audit.json',JSON.stringify(detailed,null,2)+'\n');
const md=['# Piste Atlas — review queue quality audit','','None of the extracted figures or candidate map/ticket links are automatically published. These are review leads, not verified resort claims.','','## Research summary','','| Metric | Count |','|---|---:|',
 ...Object.entries(stats).filter(([k,v])=>typeof v==='number').map(([k,v])=>'| '+k+' | '+v+' |'),
 '','## Candidate metric counts','','| Metric | Evidence matches |','|---|---:|',
 ...Object.entries(byMetric).map(([k,v])=>'| '+k+' | '+v+' |'),
 '','## Risk flags requiring manual reconciliation','','| Resort | Flag | Metric / details |','|---|---|---|',
 ...risks.map(r=>'| '+r.resort.replace(/\|/g,'/')+' ('+r.region+') | '+r.kind+' | '+((r.metric||'')+' '+(r.values||[]).join(', ')).trim()+' |'),
 '','**Next:** Verify exact official sources and resort identity before transferring selected values to the reviewed data layer. Do not confuse private resort-property acreage with actual skiable acreage; trail percentages are not run counts.'];
fs.writeFileSync('reports/ENRICHMENT_AUDIT.md',md.join('\n')+'\n');
console.log(JSON.stringify(stats));
