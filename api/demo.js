import { neon } from '@neondatabase/serverless';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const mode=String(req.query?.mode||'demo');
 if(mode!=='demo')return res.status(403).json({error:'Live connections have not been authorized or configured'});
 const conn=process.env.DATABASE_URL;
 if(!conn)return res.status(503).json({error:'Database not connected'});
 try {
 const sql=neon(conn);
 const tenants=await sql`SELECT id,name,industry,mission,vision,north_star FROM pgos_tenants WHERE data_mode='demo' ORDER BY id`;
 const result=[];
 for(const t of tenants){
 const [kpis,objectives,initiatives,projects,links,releases,people,connectors]=await Promise.all([
 sql`SELECT title,value,delta FROM pgos_kpis WHERE tenant_id=${t.id} AND is_demo=TRUE ORDER BY id`,
 sql`SELECT id,title,progress,owner,metric FROM pgos_objectives WHERE tenant_id=${t.id} AND is_demo=TRUE ORDER BY id`,
 sql`SELECT id,objective_id,name,owner,health,investment,description,release_target,gtm FROM pgos_initiatives WHERE tenant_id=${t.id} AND is_demo=TRUE ORDER BY id`,
 sql`SELECT id,key,name,epics,stories,sprint,status,complete FROM pgos_projects WHERE tenant_id=${t.id} AND is_demo=TRUE ORDER BY id`,
 sql`SELECT initiative_id,project_id FROM pgos_initiative_projects WHERE tenant_id=${t.id}`,
 sql`SELECT initiative_id,name,release_date,phase,readiness FROM pgos_releases WHERE tenant_id=${t.id} AND is_demo=TRUE ORDER BY release_date`,
 sql`SELECT display_name,role FROM pgos_tenant_users WHERE tenant_id=${t.id} AND is_demo=TRUE ORDER BY id`,
 sql`SELECT provider,status FROM pgos_connectors WHERE tenant_id=${t.id} AND is_demo=TRUE ORDER BY provider`
 ]);
 const index=Object.fromEntries(objectives.map((x,i)=>[x.id,i])),key=Object.fromEntries(projects.map(p=>[p.id,p.key]));
 result.push({id:t.id,name:t.name,industry:t.industry,mission:t.mission,vision:t.vision,northStar:t.north_star,
 kpis:kpis.map(x=>[x.title,x.value,x.delta]),okrs:objectives.map(x=>({name:x.title,progress:x.progress,owner:x.owner,metric:x.metric})),
 initiatives:initiatives.map(x=>({id:x.id.slice(t.id.length+1),name:x.name,objective:index[x.objective_id]??0,owner:x.owner,health:x.health,investment:x.investment,desc:x.description,release:x.release_target,gtm:x.gtm,projects:links.filter(l=>l.initiative_id===x.id).map(l=>key[l.project_id]).filter(Boolean)})),
 jira:projects.map(p=>({key:p.key,name:p.name,epics:p.epics,stories:p.stories,sprint:p.sprint,status:p.status,complete:p.complete})),
 releases:releases.map(r=>({name:r.name,date:String(r.release_date).slice(0,10),initiative:String(r.initiative_id||'').slice(t.id.length+1),phase:r.phase,readiness:r.readiness})),
 people:people.map(p=>[p.display_name,p.role==='admin'?'Platform Admin':p.role==='viewer'?'Executive Sponsor':'Product Manager',p.role]),
 connectors:connectors.map(c=>({provider:c.provider,status:c.status}))});
 }
 return res.status(200).json({mode:'demo',source:'neon',tenants:result});
 }catch(err){console.error('Demo API failed:',err.message);return res.status(503).json({error:'Demo dataset unavailable'})}
}