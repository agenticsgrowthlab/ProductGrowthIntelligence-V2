import {neon} from '@neondatabase/serverless';
import {timingSafeEqual} from 'node:crypto';
const sections=new Set(['overview','strategy','ideas','initiatives','roadmap','delivery','gtm','telemetry','integrations','team','automation']);
function authorized(req){const expected=process.env.REAL_WORKSPACE_EDIT_KEY||'';const actual=req.headers['x-workspace-key']||'';if(typeof actual!=='string'||!expected||actual.length!==expected.length)return false;return timingSafeEqual(Buffer.from(actual),Buffer.from(expected))}
export default async function handler(req,res){
res.setHeader('Cache-Control','no-store');
if(!['GET','PUT'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
if(!authorized(req))return res.status(401).json({error:'Workspace edit key missing or invalid. Configure REAL_WORKSPACE_EDIT_KEY securely in Vercel.'});
if(!process.env.DATABASE_URL)return res.status(503).json({error:'Neon connection unavailable'});
const sql=neon(process.env.DATABASE_URL);
try{
if(req.method==='GET'){const records=await sql`SELECT section,fields FROM pgos_real_workspace WHERE workspace_id='owner'`;return res.status(200).json({sections:Object.fromEntries(records.map(r=>[r.section,r.fields]))})}
const {section,fields}=req.body||{};
if(!sections.has(section)||!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).length>25)return res.status(400).json({error:'Invalid section or fields'});
for(const [key,value] of Object.entries(fields)){if(key.length>100||typeof value!=='string'||value.length>2500)return res.status(400).json({error:'Field too long'})}
await sql`INSERT INTO pgos_real_workspace(workspace_id,section,fields) VALUES('owner',${section},${JSON.stringify(fields)}::jsonb) ON CONFLICT(workspace_id,section) DO UPDATE SET fields=EXCLUDED.fields,updated_at=NOW()`;
return res.status(200).json({saved:true,section});
}catch(error){console.error('Real workspace failed',error.message);return res.status(503).json({error:'Real workspace database operation failed'})}
}