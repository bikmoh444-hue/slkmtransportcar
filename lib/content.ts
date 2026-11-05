import {publicSettingsData} from './security/settings';
import {cache} from 'react';
import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { seed } from './seed';
import { tables, type Content, type RecordData } from './model';
import { configured } from './supabase';
import {supabaseConfig} from './auth/config';
export function preview() { return process.env.SLKM_PREVIEW === 'true'; }
const live = unstable_cache(async () => { const config=supabaseConfig();if(!config.ok)throw new Error('Supabase configuration invalid');const db = createClient(config.url,config.key,{global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})},auth:{persistSession:false,autoRefreshToken:false}}); const results = await Promise.all(tables.map(async (table) => { const { data, error } = await db.from(table).select(`id,key,label_fr,label_ar,data,sort_order,is_active${table==='transport_lines'?',origin_city_id,destination_city_id':table==='agencies'?',city_id':''}`).eq('is_active', true).order('sort_order'); if (error)
    throw new Error(`Content unavailable: ${table}`); return [table, table==='site_settings'?(data as unknown as RecordData[]).map(row=>({...row,data:publicSettingsData(row.data)})):data] as const; })); return Object.fromEntries(results) as unknown as Content; }, ['public-content-security-v6'], { tags: ['content'], revalidate: 300 });
export const getContent = cache(async function getContent() { if (preview())
    return seed; if (!configured())
    throw new Error('Supabase absent. Configurez les variables ou SLKM_PREVIEW=true pour une prévisualisation explicite.'); return live(); });
