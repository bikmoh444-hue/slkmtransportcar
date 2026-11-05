import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema public,auth,storage to anon,authenticated,service_role;grant select,insert,delete on storage.objects to anon,authenticated;`);
const migration=(await readFile('supabase/migrations/202611030001_initial.sql','utf8')).replace('create extension if not exists pgcrypto;','');
await db.exec(migration);await db.exec(await readFile('supabase/migrations/202611030002_structured_transport.sql','utf8'));await db.exec(await readFile('supabase/migrations/202611030003_media_attachment.sql','utf8'));await db.exec(await readFile('supabase/seed.sql','utf8'));
const admin='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
await db.exec(`insert into auth.users values('${admin}'),('${other}');insert into public.admin_users(user_id) values('${admin}');insert into public.services(key,label_fr,label_ar,is_active) values('draft','Brouillon','مسودة',false);`);
async function as(role,uid,fn){await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${uid||''}',false);`);try{await fn()}finally{await db.exec('reset role')}}
async function rejects(sql){await assert.rejects(()=>db.exec(sql))}
await as('anon','',async()=>{const rows=await db.query('select * from services');assert.equal(rows.rows.length,5);await rejects('select * from complaints');await rejects("insert into complaints(full_name,email,message,locale) values('Test','t@example.org','A valid message','fr')");await rejects(`insert into admin_users(user_id) values('${other}')`);await rejects("select consume_complaint_limit(repeat('a',64))");await rejects("insert into services(key) values('bad')")});
await as('authenticated',other,async()=>{assert.equal((await db.query('select * from complaints')).rows.length,0);assert.equal((await db.query('select * from services')).rows.length,5);await rejects(`insert into admin_users(user_id) values('${other}')`);await rejects("insert into services(key) values('bad')");await rejects("insert into storage.objects(bucket_id) values('slkm-media')")});
await as('authenticated',admin,async()=>{assert.equal((await db.query('select * from services')).rows.length,6);await db.exec("update services set label_fr='Texte sauvegardé',is_active=true where key='draft'");await db.exec("insert into complaints(full_name,email,message,locale) values('Test privé','test@example.org','Une réclamation privée','fr')");assert.equal((await db.query('select * from complaints')).rows.length,1);await db.exec("insert into storage.objects(bucket_id) values('slkm-media')")});
await as('anon','',async()=>assert.equal((await db.query("select label_fr from services where key='draft'")).rows[0].label_fr,'Texte sauvegardé'));
for(let i=0;i<6;i++){const {rows}=await db.query("select consume_complaint_limit(repeat('a',64)) as allowed");assert.equal(rows[0].allowed,i<5)}
await db.exec("update services set label_fr='Personnalisation conservée' where key='voyageurs'");
await db.exec(await readFile('supabase/seed.sql','utf8'));assert.equal((await db.query("select label_fr from services where key='draft'")).rows[0].label_fr,'Texte sauvegardé');
assert.equal((await db.query("select label_fr from services where key='voyageurs'")).rows[0].label_fr,'Personnalisation conservée');
await db.exec("insert into media_assets(seed_key,storage_path,mime,size) values('coaches','test/coaches.webp','image/webp',100);update hero_slides set data=jsonb_set(data,'{body_fr}','\"Paragraphe personnalisé\"'::jsonb) where key='voyageurs';");
const asset=(await db.query("select id from media_assets where seed_key='coaches'")).rows[0].id;
await as('service_role','',async()=>{await db.query("select attach_seed_media('coaches',$1,'https://storage.example.invalid/test/coaches.webp')",[asset])});
let attached=(await db.query("select data from hero_slides where key='voyageurs'")).rows[0].data;
assert.equal(attached.body_fr,'Paragraphe personnalisé');assert.equal(attached.image,'https://storage.example.invalid/test/coaches.webp');
await db.exec("update hero_slides set data=jsonb_set(data,'{image}','\"/media/custom.webp\"'::jsonb) where key='voyageurs'");
await as('service_role','',async()=>{await db.query("select attach_seed_media('coaches',$1,'https://storage.example.invalid/test/coaches.webp')",[asset])});
attached=(await db.query("select data from hero_slides where key='voyageurs'")).rows[0].data;assert.equal(attached.image,'/media/custom.webp');
await db.exec("update site_settings set data=(data-'yellow'-'theme_version')||jsonb_build_object('orange','#F58220','custom_note','Conserver') where key='identity'");
const lemonMigration=await readFile('supabase/migrations/202611030004_lemon_theme.sql','utf8');await db.exec(lemonMigration);
let theme=(await db.query("select data from site_settings where key='identity'")).rows[0].data;
assert.equal(theme.yellow,'#F4E52C');assert.equal(theme.orange,'#F58220');assert.equal(theme.custom_note,'Conserver');
await db.exec("update site_settings set data=jsonb_set(data,'{yellow}','\"#EDEA32\"'::jsonb) where key='identity'");await db.exec(lemonMigration);
theme=(await db.query("select data from site_settings where key='identity'")).rows[0].data;assert.equal(theme.yellow,'#EDEA32');
const orangeMigration=await readFile('supabase/migrations/202611030005_blue_orange_theme.sql','utf8');await db.exec(orangeMigration);
theme=(await db.query("select data from site_settings where key='identity'")).rows[0].data;
assert.equal(theme.orange,'#C46200');assert.equal(theme.orange_hover,'#A95000');assert.equal(theme.blue,'#08648B');assert.equal(theme.theme_version,2);assert.equal(Object.hasOwn(theme,'yellow'),false);assert.equal(theme.custom_note,'Conserver');
assert.equal(theme.phone,'05 28 26 39 62');assert.equal(theme.logo,'');
await db.exec("update site_settings set data=jsonb_set(data,'{blue}','\"#07527A\"'::jsonb) where key='identity'");await db.exec(orangeMigration);
theme=(await db.query("select data from site_settings where key='identity'")).rows[0].data;assert.equal(theme.blue,'#07527A');
await db.exec('alter table auth.users add column email text');
const firstAdminSql=await readFile('supabase/admin/grant-first-admin.sql','utf8');
await assert.rejects(()=>db.exec(firstAdminSql),/Aucun compte Supabase Auth/);await db.exec('rollback');
const owner='33333333-3333-4333-8333-333333333333';
await db.exec(`insert into auth.users(id,email) values('${owner}','slkmtransport@gmail.com')`);
const before=(await db.query('select user_id from admin_users order by user_id')).rows;
await db.exec(firstAdminSql);await db.exec(firstAdminSql);
assert.equal((await db.query('select user_id from admin_users where user_id=$1',[owner])).rows.length,1);
assert.deepEqual((await db.query('select user_id from admin_users where user_id<>$1 order by user_id',[owner])).rows,before);
await db.exec(await readFile('supabase/migrations/202611040001_admin_dashboard_v2.sql','utf8'));
await as('anon','',async()=>{await rejects('select * from site_visit_events');await rejects('select * from admin_activity_logs');await rejects("select record_site_visit(repeat('b',64),gen_random_uuid(),gen_random_uuid(),'/fr')")});
await as('authenticated',other,async()=>{assert.equal((await db.query('select * from admin_activity_logs')).rows.length,0);await rejects("insert into site_visit_events(visitor_id,session_id,page_path) values(gen_random_uuid(),gen_random_uuid(),'/fr')")});
await as('authenticated',admin,async()=>{await db.exec("update services set label_fr='Audit v?rifi?' where key='voyageurs'");assert.equal((await db.query('select * from admin_activity_logs')).rows.length,1);assert.equal((await db.query('select * from admin_traffic_daily()')).rows.length,0)});
for(let i=0;i<31;i++){const r=await db.query("select record_site_visit(repeat('b',64),gen_random_uuid(),gen_random_uuid(),'/fr') as allowed");assert.equal(r.rows[0].allowed,i<30)}
await as('authenticated',admin,async()=>{const r=await db.query('select admin_traffic_summary() as stats');assert.equal(r.rows[0].stats.total,30)});

await db.exec(await readFile('supabase/migrations/202611040002_media_cleanup.sql','utf8'));
await db.exec("insert into storage.objects(bucket_id,name) values('slkm-media','uploads/unused.webp'),('slkm-media','uploads/shared.webp');update site_settings set data=jsonb_set(data,'{logo}','\"https://example.invalid/storage/v1/object/public/slkm-media/uploads/shared.webp\"'::jsonb) where key='identity'");
await as('authenticated',other,async()=>{assert.equal((await db.query("select media_object_unused('uploads/unused.webp') as allowed")).rows[0].allowed,false)});
await as('authenticated',admin,async()=>{
 assert.equal((await db.query("select media_object_unused('uploads/unused.webp') as allowed")).rows[0].allowed,true);
 assert.equal((await db.query("select media_object_unused('uploads/shared.webp') as allowed")).rows[0].allowed,false);
 await db.exec("delete from storage.objects where name in ('uploads/unused.webp','uploads/shared.webp')");
 assert.equal((await db.query("select name from storage.objects where name='uploads/unused.webp'")).rows.length,0);
 assert.equal((await db.query("select name from storage.objects where name='uploads/shared.webp'")).rows.length,1);
});
await db.close();console.log('PASS: migrations, RLS, persistence, media, theme, targeted first-admin UUID grant and idempotence');
