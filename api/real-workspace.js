import {neon} from '@neondatabase/serverless';
import {timingSafeEqual} from 'node:crypto';
const sections=new Set(['overview','strategy','ideas','initiatives','roadmap','delivery','gtm','telemetry','integrations','team','automation']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function authorized(req){const expected=process.env.REAL_WORKSPACE_EDIT_KEY||'';const actual=req.headers['x-workspace-key']||'';if(typeof actual!=='string'||!expected||actual.length!==expected.length)return false;return timingSafeEqual(Buffer.from(actual),Buffer.from(expected))}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 if(!['GET','POST','PATCH','PUT'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 if(!authorized(req))return res.status(401).json({error:'Sign in using the upper-right profile to access Real Data'});
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Neon connection unavailable'});
 try{
 const sql=neon(process.env.DATABASE_URL);
 const companies=await sql`SELECT id,name FROM pgos_real_companies ORDER BY created_at,id`;
 if(req.method==='POST'){
 const name=String(req.body?.name||'').trim();
 if(name.length<2||name.length>100)return res.status(400).json({error:'Company name must be 2–100 characters'});
 const added=await sql`INSERT INTO pgos_real_companies(name) VALUES(${name}) RETURNING id,name`;
 return res.status(201).json({company:added[0]});
 }
 if(req.method==='PATCH'){
 const id=String(req.body?.companyId||''),name=String(req.body?.name||'').trim();
 if(!uuid.test(id)||name.length<2||name.length>100)return res.status(400).json({error:'Invalid company or company name'});
 const changed=await sql`UPDATE pgos_real_companies SET name=${name} WHERE id=${id}::uuid RETURNING id,name`;
 return changed.length?res.status(200).json({company:changed[0]}):res.status(404).json({error:'Company not found'});
 }
 if(req.method==='GET'&&!req.query?.companyId)return res.status(200).json({companies});
 const companyId=String(req.method==='GET'?req.query.companyId:req.body?.companyId||'');
 if(!uuid.test(companyId)||!companies.some(c=>c.id===companyId))return res.status(404).json({error:'Select a valid Real Data company'});
 if(req.method==='GET'){
 const rows=await sql`SELECT section,fields FROM pgos_real_workspace WHERE company_id=${companyId}::uuid`;
 return res.status(200).json({companies,companyId,sections:Object.fromEntries(rows.map(r=>[r.section,r.fields]))});
 }
 const {section,fields}=req.body||{};
 if(!sections.has(section)||!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).length>25)return res.status(400).json({error:'Invalid section or fields'});
 for(const [key,value] of Object.entries(fields))if(key.length>100||typeof value!=='string'||value.length>2500)return res.status(400).json({error:'Field too long'});
 await sql`INSERT INTO pgos_real_workspace(workspace_id,company_id,section,fields) VALUES(${companyId},${companyId}::uuid,${section},${JSON.stringify(fields)}::jsonb) ON CONFLICT(workspace_id,section) DO UPDATE SET fields=EXCLUDED.fields,company_id=EXCLUDED.company_id,updated_at=NOW()`;
 return res.status(200).json({saved:true,companyId,section});
 }catch(error){console.error('Real workspace error:',error.message);return res.status(503).json({error:'Real workspace database operation failed'})}
}