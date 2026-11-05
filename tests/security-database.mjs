// Ephemeral in-memory PostgreSQL only. No URL, credentials or persistent database.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
try {
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
 await db.exec(await readFile('supabase/migrations/202611040003_phase1_login_protection.sql','utf8'));
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query('select * from public.admin_login_limits'));
  await assert.rejects(db.query("select public.consume_admin_login_limit(repeat('a',64),repeat('b',64))"));
  await assert.rejects(db.query("select public.complete_admin_login(repeat('b',64))"));
  await db.exec('reset role');
 }
 async function consume(network='a',pair='b'){
  await db.exec('set role service_role');
  try{return (await db.query('select public.consume_admin_login_limit($1,$2) as result',[network.repeat(64),pair.repeat(64)])).rows[0].result}
  finally{await db.exec('reset role')}
 }
 for(let i=0;i<5;i++)assert.equal((await consume()).allowed,true);
 const blocked=await consume();assert.equal(blocked.allowed,false);assert.ok(blocked.retry_after>0&&blocked.retry_after<=15);
 const before=(await db.query("select next_allowed_at from admin_login_limits where key='p_'||repeat('b',64)")).rows[0].next_allowed_at;
 await consume();assert.deepEqual((await db.query("select next_allowed_at from admin_login_limits where key='p_'||repeat('b',64)")).rows[0].next_allowed_at,before,'blocked attempts must not extend cooldown');
 assert.equal((await consume('a','c')).allowed,true,'another account/network pair remains recoverable');
 await db.exec("update admin_login_limits set next_allowed_at=now()-interval '1 second' where key='p_'||repeat('b',64)");
 assert.equal((await consume()).allowed,true);assert.ok((await consume()).retry_after<=30);
 await db.exec("set role service_role;select public.complete_admin_login(repeat('b',64));reset role");
 assert.equal((await db.query("select count(*)::int as n from admin_login_limits where key='p_'||repeat('b',64)")).rows[0].n,0);
 assert.ok((await db.query("select attempts from admin_login_limits where key='n_'||repeat('a',64)")).rows[0].attempts>0);
 for(let i=0;i<30;i++)await consume('d',i.toString(16).padStart(2,'0').repeat(32).slice(0,1));
 assert.equal((await consume('d','e')).allowed,false);
 await db.exec("update admin_login_limits set expires_at=now()-interval '1 second' where key='n_'||repeat('d',64)");
 assert.equal((await consume('d','e')).allowed,true,'expired network quota recovers');
 await assert.rejects(db.query("select public.consume_admin_login_limit(null,repeat('b',64))"));
 console.log('PASS: isolated login migration, RLS/privileges, progressive cooldown, network quota, expiry and successful-login recovery');
}finally{await db.close()}
