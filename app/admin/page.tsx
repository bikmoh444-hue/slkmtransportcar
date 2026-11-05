import {NetworkMapEditor} from '@/components/admin-network-map';
import {preview} from '@/lib/content';
import {cookies} from 'next/headers';
import {AdminText} from '@/components/admin-language';
import {BrandSettings} from '@/components/admin-brand-settings';
import {AccountSettings} from '@/components/account-settings';
import {AdminShell} from '@/components/admin-shell';
import {Dashboard} from '@/components/admin-dashboard';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase';
import {headers} from 'next/headers';
import {AdminAccessError,accessFailure,logAuthFailure} from '@/lib/auth/errors';
import { tables, type RecordData } from '@/lib/model';
import { Editor, MediaUpload, ComplaintEditor } from '@/components/admin-editor';
import { Media } from '@/components/media';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'SLKM — Dashboard', robots: { index: false, follow: false } };
const sections = [['reseau','Lignes et réseau'],['location','Location de transport'],['contact','Contact'],[ 'accueil', 'Accueil'], ['histoire', 'Notre histoire'], ['messagerie', 'Messagerie'], ['activities', 'Activités'], ['analytics', 'Statistiques'], ['overview', 'Vue d’ensemble'], ['site_settings', 'Identité et coordonnées'], ['navigation_items', 'Navigation'], ['hero_slides', 'Hero'], ['page_sections', 'Présentation et sections'], ['services', 'Services'], ['network_maps', 'Réseau et cartes'], ['cities', 'Villes'], ['transport_lines', 'Lignes'], ['agencies', 'Agences'], ['fleet_items', 'Flotte'], ['complaints', 'Réclamations'], ['media', 'Médiathèque'], ['seo_settings', 'Traductions et SEO']];
export default async function Admin({ searchParams }: {
    searchParams: Promise<{
        section?: string;
        page?: string;
        q?: string;
        status?: string;
        login?: string;
        [key:string]: string | undefined;
    }>;
}) {
    const p = await searchParams;
    const locale = (await cookies()).get('slkm-admin-locale')?.value === 'ar' ? 'ar' : 'fr';
    const now = new Date().toISOString();
    let db;
    try {
        db = await requireAdmin();
    }
    catch(error) {
        let failure=accessFailure(error,'admin_page');
        const requestHeaders=await headers();
        if(failure.code==='session_missing'){
            const refreshError=requestHeaders.get('x-slkm-session-error');
            if(refreshError==='service_unavailable'||refreshError==='auth_service')failure=new AdminAccessError(refreshError,'session_refresh');
            else if(p.login==='complete'||requestHeaders.get('x-slkm-had-session')==='1')failure=new AdminAccessError('session_lost','admin_redirect');
            if(failure.code!=='session_missing')logAuthFailure(failure);
        }
        redirect(`/admin/login?error=${failure.code}`);
    }
    if(p.login==='complete')redirect('/admin');

    const section = sections.some(x => x[0] === p.section) ? p.section! : 'overview';
    const page = Math.max(1, Math.min(100000, Number(p.page) || 1));
    let content: React.ReactNode;
    if (['accueil','histoire','messagerie','reseau','location'].includes(section)) {
        const groups: [string,string,string[]?][] = section==='accueil' ? [['hero_slides','Images et boutons principaux'],['page_sections','Sections accueil'],['services','Services affichés']] : section==='histoire' ? [['page_sections','Notre histoire',['histoire']]] : section==='messagerie' ? [['page_sections','Présentation',['messagerie']],['network_maps','Carte de messagerie',['messagerie']],['services','Service de messagerie',['messagerie']],['agencies','Agences de messagerie']] : section==='reseau' ? [['page_sections','Présentation du réseau',['reseau']],['network_maps','Carte du réseau voyageurs — image',['voyageurs']],['services','Transport de voyageurs',['voyageurs']],['cities','Villes'],['transport_lines','Lignes'],['agencies','Agences voyageurs']] : [['page_sections','Location de transport',['transports']],['services','Prestations de transport',['personnel','tourisme','bennes']],['fleet_items','Véhicules et offres']];
        const [cities,agencies]=['reseau','messagerie'].includes(section)?await Promise.all([db.from('cities').select('id,label_fr,label_ar').order('sort_order'),db.from('agencies').select('id,label_fr,label_ar').order('sort_order')]):[null,null];
        content=<>{await Promise.all(groups.map(async ([table,title,keys])=>{const listPage=Math.max(1,Math.min(100000,Math.floor(Number(p[table+'_page'])||1)));let query=db.from(table).select(`id,key,label_fr,label_ar,data,sort_order,is_active${table==='transport_lines'?',origin_city_id,destination_city_id':table==='agencies'?',city_id':''}`).order('sort_order');if(keys)query=query.in('key',keys);if(section==='accueil'&&table==='services')query=query.not('key','in','(voyageurs,messagerie,personnel,tourisme,bennes)');if(section==='accueil'&&table==='page_sections')query=query.not('key','in','(histoire,reseau,messagerie,transports,contact)');if(['cities','transport_lines','agencies'].includes(table))query=section==='messagerie'?query.eq('data->>type','messagerie'):query.or('data->>type.eq.voyageurs,data->>type.is.null');if(!keys)query=query.range((listPage-1)*20,listPage*20);const {data:found,error}=await query;const hasMore=(found?.length||0)>20;const data=keys?found:found?.slice(0,20);const pageLink=(n:number)=>'?'+new URLSearchParams({...Object.fromEntries(Object.entries(p).filter((entry):entry is [string,string]=>typeof entry[1]==='string')),[table+'_page']:String(n)}).toString();return <section key={table}><h2><AdminText>{title}</AdminText></h2>{error?<p role="alert">Lecture impossible.</p>:table==='network_maps'?<NetworkMapEditor mapKey={keys?.[0]==='messagerie'?'messagerie':'voyageurs'} rows={(data||[]) as unknown as RecordData[]}/>:<Editor agencies={agencies?.data||[]} cities={cities?.data||[]} table={table} rows={(data||[]) as unknown as RecordData[]} allowAdd={!keys} defaults={['cities','transport_lines','agencies'].includes(table)?{type:section==='messagerie'?'messagerie':'voyageurs'}:undefined}/>}<div className="admin-actions">{listPage>1&&<a className="button" href={pageLink(listPage-1)}><AdminText>{'← Précédent'}</AdminText></a>}{hasMore&&<a className="button" href={pageLink(listPage+1)}><AdminText>{'Suivant'}</AdminText></a>}</div></section>}))}</>;
    }
    else if (['overview','analytics','activities'].includes(section)) { content=<Dashboard db={db} mode={section} locale={locale} now={now}/>; }
    else if(section==='site_settings'){
        const [settings,seo,account]=await Promise.all([db.from('site_settings').select('*').order('sort_order'),db.from('seo_settings').select('*').order('sort_order'),db.auth.getUser()]);
        content=<><h2><AdminText>{"Identité et configuration du site"}</AdminText></h2>{settings.error?<p role="alert"><AdminText>{"Lecture impossible."}</AdminText></p>:<><BrandSettings row={(settings.data||[]).find(x=>x.key==='identity')}/><Editor table="site_settings" rows={settings.data||[]} scope="global"/><h2>Navigation</h2><NavigationSettings db={db}/></>}<h2><AdminText>{"SEO et titre de l’onglet"}</AdminText></h2>{seo.error?<p role="alert"><AdminText>{"Lecture impossible."}</AdminText></p>:<Editor table="seo_settings" rows={seo.data||[]}/>}<AccountSettings email={account.data.user?.email||''}/></>;
    }
    else if ((tables as readonly string[]).includes(section)) {
        const { data, error } = await db.from(section).select('*').order('sort_order');
        const [cities,agencies]=['transport_lines','agencies'].includes(section)?await Promise.all([db.from('cities').select('id,label_fr,label_ar').order('sort_order'),db.from('agencies').select('id,label_fr,label_ar').order('sort_order')]):[null,null];
        content = error ? <p className="error"><AdminText>{"Lecture impossible"}</AdminText></p> : <Editor cities={cities?.data||[]} agencies={agencies?.data||[]} table={section} rows={(data || []) as RecordData[]}/>;
    }
    else if (section === 'media') {
        const { data, error } = await db.from('media_assets').select('*').order('created_at', { ascending: false });
        content = <>
        <MediaUpload />
        <p className="admin-muted"><AdminText>{"Copiez le lien dans un champ image. Les médias restent conservés pour éviter de casser les contenus référencés."}</AdminText></p>{error && <p className="error"><AdminText>{"Lecture impossible"}</AdminText></p>}<div className="media-library">{data?.map(x => {
                const url = x.storage_path ? db.storage.from('slkm-media').getPublicUrl(x.storage_path).data.publicUrl : x.local_path;
                return <article className="admin-card" key={x.id}>
                <Media src={url} alt={(locale==='ar'?x.alt_ar:x.alt_fr) || 'SLKM'}/>
                <p>{locale==='ar'?x.alt_ar||x.alt_fr:x.alt_fr}</p>
                <code>{url}</code>
                </article>;
            })}</div>
        </>;
    }
    else if (section === 'complaints' || section === 'contact') {
        let query = db.from('complaints').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * 10, page * 10 - 1);
        if (p.status && ['new', 'in_progress', 'resolved', 'archived'].includes(p.status))
            query = query.eq('status', p.status);
        if (p.q)
            query = query.ilike('full_name', `%${p.q.replace(/[%_]/g, '').slice(0, 120)}%`);
        const { data, count, error } = await query;
        content = <>
        {section==='contact'&&<ContactSettings db={db}/>}
        <h2><AdminText>{"Messages et réclamations"}</AdminText></h2><form className="admin-card">
        <input type="hidden" name="section" value={section}/>
        <label><AdminText>{"Recherche par nom"}</AdminText><input name="q" defaultValue={p.q} maxLength={120}/>
        </label>
        <label><AdminText>{"Statut"}</AdminText><select name="status" defaultValue={p.status || ''}>
        <option value=""><AdminText>{"Tous"}</AdminText></option>
        <option value="new"><AdminText>{"Nouvelle"}</AdminText></option>
        <option value="in_progress"><AdminText>{"En cours"}</AdminText></option>
        <option value="resolved"><AdminText>{"Traitée"}</AdminText></option>
        <option value="archived"><AdminText>{"Archivée"}</AdminText></option>
        </select>
        </label>
        <button className="button primary"><AdminText>{"Filtrer"}</AdminText></button>
        </form>{error && <p className="error"><AdminText>{"Lecture impossible"}</AdminText></p>}{!data?.length && <p><AdminText>{"Aucune réclamation"}</AdminText></p>}{data?.map(x => <details className="admin-card" id={x.id} key={x.id}>
            <summary>{x.full_name}<AdminText>{"·"}</AdminText>{new Date(x.created_at).toLocaleString('fr-FR')}<AdminText>{"·"}</AdminText><AdminText>{{new:'Nouvelle',in_progress:'En cours',resolved:'Traitée',archived:'Archivée'}[x.status as string]||x.status}</AdminText></summary>
            <p>
            <bdi>{x.email}</bdi>
            </p>
            <p style={{ whiteSpace: 'pre-wrap', marginBlock: 20 }}>{x.message}</p>
            <ComplaintEditor id={x.id} status={x.status} notes={x.internal_notes || ''} email={x.email}/>
            </details>)}<div className="admin-actions">{page > 1 && <a className="button" href={`?${new URLSearchParams({ section, page: String(page - 1), q: p.q || '', status: p.status || '' })}`}><AdminText>{"← Précédent"}</AdminText></a>}{page * 10 < (count || 0) && <a className="button" href={`?${new URLSearchParams({ section, page: String(page + 1), q: p.q || '', status: p.status || '' })}`}><AdminText>{"Suivant"}</AdminText></a>}</div>
        </>;
    }
    else { content=<Dashboard db={db} mode="overview" locale={locale} now={now}/>; }
    return <AdminShell locale={locale} dateLabel={new Intl.DateTimeFormat(locale==='ar'?'ar-MA':'fr-MA',{dateStyle:'full',timeZone:'Africa/Casablanca'}).format(new Date(now))} section={section} title={section==='overview'?'Statistiques':section==='site_settings'?'Paramètres':sections.find(x=>x[0]===section)?.[1].split(' / ')[0] || 'Gestion'}>{preview()&&<p className="admin-card" role="note"><AdminText>{"Le site public affiche le contenu de démonstration. Les modifications enregistrées seront visibles en mode réel."}</AdminText></p>}{content}</AdminShell>;
}

async function ContactSettings({db}:{db:Awaited<ReturnType<typeof requireAdmin>>}){
 const [settings,sections]=await Promise.all([db.from('site_settings').select('id,key,label_fr,label_ar,data,sort_order,is_active').eq('key','identity'),db.from('page_sections').select('id,key,label_fr,label_ar,data,sort_order,is_active').eq('key','contact')]);
 return <>{settings.error||sections.error?<p role="alert">Lecture impossible.</p>:<><h2><AdminText>{"Coordonnées"}</AdminText></h2><Editor table="site_settings" rows={settings.data||[]} scope="contact"/><h2><AdminText>{"Présentation"}</AdminText></h2><Editor table="page_sections" rows={sections.data||[]} allowAdd={false}/></>}</>;
}
async function NavigationSettings({db}:{db:Awaited<ReturnType<typeof requireAdmin>>}){const {data,error}=await db.from('navigation_items').select('id,key,label_fr,label_ar,data,sort_order,is_active').order('sort_order');return error?<p role="alert">Lecture impossible.</p>:<Editor table="navigation_items" rows={data||[]}/>}
