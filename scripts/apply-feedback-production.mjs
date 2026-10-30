import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ref='eefgpaqjdhgsqljknsfp';
if(process.argv[2]!==ref)throw Error('Production project guard failed');
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)throw Error('Management credential missing');
async function api(path,options={}){
 const r=await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
 if(!r.ok)throw Error(`Production API ${path}: ${r.status}`);
 return r.json();
}
const query=sql=>api('/database/query',{method:'POST',body:JSON.stringify({query:sql})});
const vault=await query("SELECT name,decrypted_secret FROM vault.decrypted_secrets WHERE name IN ('harutodo_function_base_url','harutodo_cron_secret','harutodo_anon_key')");
const values=Object.fromEntries(vault.map(v=>[v.name,v.decrypted_secret]));
if(values.harutodo_function_base_url!==`https://${ref}.supabase.co/functions/v1`||!values.harutodo_cron_secret||!values.harutodo_anon_key)throw Error('Production cron configuration incomplete');
const secrets=await api('/secrets');
const digest=s=>createHash('sha256').update(s).digest('hex');
if(secrets.find(s=>s.name==='CRON_SECRET')?.value.toLowerCase()!==digest(values.harutodo_cron_secret))throw Error('Cron secret differs between Vault and Edge Functions');
const versions=['20261029000000','20261029000001'];
const history=await query("SELECT version,name FROM supabase_migrations.schema_migrations WHERE version IN ('20261029000000','20261029000001')");
console.log(JSON.stringify({productionProject:ref,cronTargetVerified:true,cronSecretMatches:true,appliedVersions:history.map(x=>x.version)}));
if(!process.argv.includes('--apply'))process.exit(0);
for(const [i,version] of versions.entries()){
 const name=i===0?'feedback':'feedback_jobs';
 const existing=history.find(x=>x.version===version);
 if(existing){if(existing.name!==name)throw Error('Migration identity mismatch');continue;}
 const sql=await readFile(`supabase/migrations/${version}_${name}.sql`,'utf8');
 await query(sql);
 await query(`INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES('${version}','${name}',ARRAY[$release_migration$${sql}$release_migration$])`);
 console.log(JSON.stringify({appliedVersion:version,sqlSha256:digest(sql)}));
}
const status=await query("SELECT (SELECT count(*) FROM pg_class WHERE oid IN (to_regclass('public.feedback'),to_regclass('public.feedback_admins'),to_regclass('public.feedback_preferences'),to_regclass('public.feedback_attachments'),to_regclass('public.feedback_notification_outbox')) AND relrowsecurity) AS rls_tables, (SELECT count(*) FROM cron.job WHERE jobname IN ('feedback-notifications','cleanup-feedback-attachments') AND active) AS active_jobs, (SELECT public FROM storage.buckets WHERE id='feedback-images') AS bucket_public");
if(status[0]?.rls_tables!==5||status[0]?.active_jobs!==2||status[0]?.bucket_public!==false)throw Error('Production schema verification failed');
console.log(JSON.stringify({productionSchemaVerified:status[0]}));
