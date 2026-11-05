import {writeFileSync} from 'node:fs';
import {seed} from '../lib/seed.ts';
const quote=(v:string)=>`'${v.replaceAll("'","''")}'`;
const sql=['-- Generated from lib/seed.ts. Insert missing records only; never overwrite edits.'];
for(const [table,rows] of Object.entries(seed)){for(const row of rows){sql.push(`insert into public.${table}(key,label_fr,label_ar,data,sort_order,is_active) values (${quote(row.key)},${quote(row.label_fr)},${quote(row.label_ar)},${quote(JSON.stringify(row.data))}::jsonb,${row.sort_order},${row.is_active}) on conflict(key) do nothing;`)}}
sql.push("update public.fleet_items f set service_id=s.id from public.services s where f.service_id is null and f.data->>'service_key'=s.key;");
writeFileSync('supabase/seed.sql',sql.join('\n')+'\n');
