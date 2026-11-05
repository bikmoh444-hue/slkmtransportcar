'use client';
import {AdminText, useAdminLanguage} from '@/components/admin-language';
import {themeData,themeDefaults} from '@/lib/theme';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RecordData } from '@/lib/model';
import { saveWithMedia, deleteRow, uploadMedia, updateComplaint } from '@/app/admin/actions';
import { Media } from './media';
import {ImageField} from './admin-image-field';
import {notifyContentUpdated} from '@/lib/content-events';
const optionNames:Record<string,string>={bus:'Autocar',package:'Colis',users:'Personnel',compass:'Tourisme',truck:'Camion',minibus:'Minibus',coach:'Autocar',tipper:'Camion-benne',trailer:'Remorque-benne',voyageurs:'Voyageurs',messagerie:'Messagerie',personnel:'Personnel',tourisme:'Tourisme',bennes:'Bennes'};
const fieldNames:Record<string,string>={maps_url:'Lien Google Maps',phone:'Téléphone fixe',mobile:'Mobile',email:'Email',whatsapp:'WhatsApp',facebook:'Facebook',instagram:'Instagram',studio_url:'Lien HM Studio',blue:'Bleu principal',deep_blue:'Bleu profond',logo_blue:'Bleu de marque',orange:'Orange soutenu',orange_hover:'Orange au survol',border:'Bordures',muted:'Texte secondaire',background:'Fond clair',surface:'Surface blanche',text:'Texte',font:'Typographie',logo:'Logo principal',footer_logo:'Logo du footer',favicon:'Icône de l’onglet',og_image:'Image de partage',address_fr:'Adresse FR',address_ar:'العنوان AR',footer_fr:'Présentation du footer FR',footer_ar:'تقديم التذييل AR',target:'Destination de navigation',secondary_cta_fr:'Bouton secondaire FR',secondary_cta_ar:'الزر الثانوي AR',secondary_href:'Destination secondaire',eyebrow_fr:'Surtitre FR',eyebrow_ar:'العنوان التمهيدي AR',values_fr:'Engagements FR — une ligne par valeur',values_ar:'الالتزامات AR — التزام في كل سطر',milestones_fr:'Jalons réels FR — un par ligne',milestones_ar:'محطات تاريخية حقيقية AR — واحدة في كل سطر',icon:'Icône',detail_fr:'Description détaillée FR',detail_ar:'الوصف المفصل AR',alt_fr:'Texte alternatif FR',alt_ar:'النص البديل AR',seats:'Capacité en places',vehicle_type:'Type de véhicule',service_key:'Service associé',features_fr:'Équipements confirmés FR — un par ligne',features_ar:'التجهيزات المؤكدة AR — واحدة في كل سطر',type:'Réseau concerné',verified:'Information vérifiée',city_fr:'Ville FR',city_ar:'المدينة AR',hours_fr:'Horaires confirmés FR',hours_ar:'المواعيد المؤكدة AR',activity_fr:'Activité FR',activity_ar:'النشاط AR',description_fr:'Description SEO FR',description_ar:'وصف الفهرسة AR'};
const names: Record<string, string> = { image: 'Image du site (ordinateur et téléphone)', mobile_image: 'Image mobile', body_fr: 'Description FR', body_ar: 'الوصف AR', second_fr: 'Paragraphe 2 FR', second_ar: 'الفقرة الثانية AR', href: 'Destination', focal: 'Cadrage desktop', mobile_focal: 'Cadrage mobile', label_fr: 'Petit label FR', label_ar: 'العنوان المصغر AR', cta_fr: 'Bouton FR', cta_ar: 'الزر AR', media_key: 'Clé du manifeste' };
export function Editor({ table, rows, allowAdd = true, scope, defaults = {}, cities = [], agencies = [] }: {
    table: string;
    rows: RecordData[];
    agencies?: Pick<RecordData,'id'|'label_fr'|'label_ar'>[]; cities?: Pick<RecordData,'id'|'label_fr'|'label_ar'>[]; allowAdd?: boolean; scope?: "contact"|"global"; defaults?: Record<string,unknown>;
}) {
    const router = useRouter();
    return <>
    {!rows.length&&<p><AdminText>{"Aucun élément enregistré."}</AdminText></p>}<p className="admin-muted"><AdminText>{"Choisissez une image puis enregistrez. L’ordre le plus petit est affiché en premier."}</AdminText></p>{[...rows, ...(!allowAdd || (table === 'site_settings' && rows.length) ? [] : [{ id: '', key: table === 'site_settings' ? 'identity' : '', label_fr: '', label_ar: '', data: defaults, sort_order: rows.length, is_active: false }])].map((row, i) => <RowEditor agencies={agencies} cities={cities} scope={scope} key={row.id || `new-${i}`} row={row} table={table} refresh={() => {notifyContentUpdated();router.refresh()}}/>)}</>;
}
function RowEditor({ row, table, refresh, scope, cities, agencies }: {
    row: RecordData;
    table: string;
    agencies: Pick<RecordData,'id'|'label_fr'|'label_ar'>[]; cities: Pick<RecordData,'id'|'label_fr'|'label_ar'>[]; refresh: () => void; scope?: "contact"|"global";
}) {
    const {locale,t}=useAdminLanguage();
    const [files,setFiles]=useState<Record<string,File>>({});
    const [expanded,setExpanded]=useState(table==='site_settings'||table==='network_maps'||!row.id);
    const [previewTitle,setPreviewTitle] = useState({fr:row.label_fr,ar:row.label_ar});
    const [settingsTab,setSettingsTab] = useState('identity');
    const [lang,setLang] = useState<'fr'|'ar'>(locale);
    const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
    const [data, setData] = useState<Record<string, unknown>>(table==='site_settings'?themeData(row.data):{ ...row.data });
    useEffect(() => { const handler = (e: BeforeUnloadEvent) => { if (dirty) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
    const tableKeys: Record<string, string[]> = { site_settings: ['logo', 'footer_logo', 'favicon', 'og_image', 'phone', 'mobile', 'email', 'whatsapp', 'facebook', 'instagram', 'studio_url', 'address_fr', 'address_ar', 'footer_fr', 'footer_ar', 'maps_url', 'hours_fr', 'hours_ar', 'blue', 'logo_blue', 'deep_blue', 'font'], navigation_items: ['target'], cities: ['body_fr', 'body_ar', 'type', 'verified'], transport_lines: ['body_fr', 'body_ar', 'type', 'verified', 'agency_ids'], agencies: ['type', 'verified', 'city_fr', 'city_ar', 'address_fr', 'address_ar', 'phone', 'whatsapp', 'hours_fr', 'hours_ar', 'activity_fr', 'activity_ar'], seo_settings: ['description_fr', 'description_ar', 'og_image'] };
    const commonKeys = table === 'hero_slides' ? ['image', 'mobile_image', 'focal', 'mobile_focal', 'label_fr', 'label_ar', 'body_fr', 'body_ar', 'cta_fr', 'cta_ar', 'href', 'secondary_cta_fr', 'secondary_cta_ar', 'secondary_href'] : table === 'services' || table === 'fleet_items' ? ['image', 'alt_fr', 'alt_ar', 'body_fr', 'body_ar', 'cta_fr', 'cta_ar', 'href', ...(table === 'fleet_items' ? ['seats', 'vehicle_type', 'service_key', 'features_fr', 'features_ar'] : ['detail_fr', 'detail_ar'])] : table === 'network_maps' ? ['image', 'body_fr', 'body_ar'] : table === 'page_sections' ? ['body_fr', 'body_ar', 'second_fr', 'second_ar', 'image', 'eyebrow_fr', 'eyebrow_ar', ...(row.key==='histoire'?['values_fr','values_ar','milestones_fr','milestones_ar']:[])] : [];
    const contactKeys=['phone','mobile','email','whatsapp','address_fr','address_ar','maps_url','hours_fr','hours_ar'];
    const keys = [...new Set([...Object.keys(data), ...commonKeys, ...(tableKeys[table] || [])])].filter(key=>!['mobile_image','mobile_focal'].includes(key)&&(!scope||(scope==='contact'?contactKeys.includes(key):!contactKeys.includes(key)))&&(table!=='site_settings'||!['logo','footer_logo','favicon','og_image','yellow','theme_version','__unused'].includes(key)));
    return <article className="admin-card editor-card">
    <button type="button" className="editor-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{(locale==='ar'?row.label_ar:row.label_fr) || t('Ajouter un élément')} <span className="status-badge">{t(row.is_active ? 'Publié' : 'Masqué')}</span>
    </button>
    <form hidden={!expanded} onChange={() => setDirty(true)} onSubmit={async (e) => { e.preventDefault(); if(busy)return; setBusy(true); const fd = new FormData(e.currentTarget); try {const uploads=new FormData();Object.entries(files).forEach(([key,file])=>uploads.set(key,file));const result = await saveWithMedia(table, { ...(row.id ? { id: row.id } : {}), key: fd.get('key'), label_fr: fd.get('label_fr'), label_ar: fd.get('label_ar'), sort_order: Number(fd.get('sort_order')), is_active: fd.get('is_active') === 'on', ...(table==='transport_lines'?{origin_city_id:fd.get('origin_city_id')||null,destination_city_id:fd.get('destination_city_id')||null}:table==='agencies'?{city_id:fd.get('city_id')||null}:{}), data:table==='site_settings'?Object.fromEntries(Object.entries(data).filter(([key])=>!['logo','footer_logo','favicon','og_image'].includes(key)&&(!scope||(scope==='contact'?contactKeys.includes(key):!contactKeys.includes(key))))):data }, uploads); setMsg(result.error || (fd.get('is_active')==='on'?'Enregistré':'Enregistré comme brouillon. Cochez « Publié » pour afficher cet élément sur le site.')); if (result.ok) {
        if(result.data)setData(current=>({...current,...result.data}));setFiles({});setDirty(false);
        refresh();
    }}catch{setMsg('Sauvegarde impossible. Vérifiez votre connexion et votre session.')}finally{setBusy(false)} }}>
    {table==='site_settings'&&scope!=='contact'&&<div className="admin-tabs settings-tabs">{[['identity','Identité'],['social','Réseaux sociaux'],['appearance','Apparence']].map(([value,title])=><button key={value} type="button" aria-pressed={settingsTab===value} onClick={()=>setSettingsTab(value)}>{t(title)}</button>)}</div>}<div className="admin-tabs"><button type="button" aria-pressed={lang==='fr'} onClick={()=>setLang('fr')}><AdminText>{"FR"}</AdminText></button><button type="button" aria-pressed={lang==='ar'} onClick={()=>setLang('ar')}><AdminText>{"AR"}</AdminText></button></div><div className="admin-fields">
    <label><AdminText>{"Clé stable"}</AdminText><input name="key" readOnly={!!row.id} defaultValue={row.key} required pattern="[a-z][a-z0-9_-]*" maxLength={80}/>
    </label>
    <label><AdminText>{"Ordre"}</AdminText><input name="sort_order" type="number" min={0} max={10000} defaultValue={row.sort_order}/>
    </label>
    <label hidden={lang!=='fr'} dir="ltr"><AdminText>{table==='site_settings'?'Nom de la société FR':'Titre français'}</AdminText><input name="label_fr" defaultValue={row.label_fr} onChange={e=>setPreviewTitle({...previewTitle,fr:e.target.value})} maxLength={500}/>
    </label>
    <label hidden={lang!=='ar'} lang="ar" dir="rtl"><AdminText>{table==='site_settings'?'Nom de la société AR':'العنوان بالعربية'}</AdminText><input name="label_ar" defaultValue={row.label_ar} onChange={e=>setPreviewTitle({...previewTitle,ar:e.target.value})} maxLength={500}/>
    </label>{(table==='transport_lines'?['origin_city_id','destination_city_id']:table==='agencies'?['city_id']:[]).map(key=><label key={key}>{t(key==='origin_city_id'?'Ville de départ':key==='destination_city_id'?'Ville d’arrivée':'Ville associée')}<select name={key} defaultValue={String(row[key as keyof RecordData]||'')}><option value="">{t('Non renseignée')}</option>{cities.map(city=><option value={city.id} key={city.id}>{locale==='ar'?city.label_ar:city.label_fr}</option>)}</select></label>)}{keys.map(key => <label hidden={(key.endsWith('_fr')?lang!=='fr':key.endsWith('_ar')?lang!=='ar':false)||(table==='site_settings'&&scope!=='contact'&&settingsTab!==(['phone','mobile','email','whatsapp','address_fr','address_ar','maps_url'].includes(key)?'contact':['facebook','instagram','studio_url'].includes(key)?'social':['font',...Object.keys(themeDefaults)].includes(key)?'appearance':'identity'))} key={key} dir={key.endsWith('_ar') ? 'rtl' : undefined}>{t(key==='agency_ids'?'Agences associées':names[key] || fieldNames[key] || key)}{/^(image|mobile_image|logo|footer_logo|favicon|og_image)$/.test(key)?<ImageField purpose={key} value={String(data[key]||'')} file={files[key]} disabled={busy} onFile={file=>{setFiles(current=>{const next={...current};if(file)next[key]=file;else delete next[key];return next});setDirty(true)}} onValue={value=>{setData({...data,[key]:value});setDirty(true)}}/>:key==='agency_ids'?<select multiple value={Array.isArray(data[key])?data[key] as string[]:[]} onChange={e=>setData({...data,[key]:Array.from(e.target.selectedOptions,option=>option.value)})}>{agencies.map(agency=><option key={agency.id} value={agency.id}>{locale==='ar'?agency.label_ar:agency.label_fr}</option>)}</select>:Object.hasOwn(themeDefaults,key)?<input type="color" value={String(data[key])} onChange={e=>setData({...data,[key]:e.target.value})}/>:key === 'verified' ? <select value={data[key] === true ? 'yes' : 'no'} onChange={e => setData({ ...data, [key]: e.target.value === 'yes' })}>
            <option value="no"><AdminText>{"À vérifier"}</AdminText></option>
            <option value="yes"><AdminText>{"Information confirmée"}</AdminText></option>
            </select> : key === 'seats' ? <input type="number" min={1} max={100} value={typeof data[key] === 'number' ? data[key] as number : ''} onChange={e => setData({ ...data, [key]: e.target.value ? Number(e.target.value) : null })}/> : key === 'font' ? <select value={String(data[key] || 'jakarta')} onChange={e => setData({ ...data, [key]: e.target.value })}>
            <option value="jakarta"><AdminText>{"Plus Jakarta Sans / Cairo"}</AdminText></option>
            <option value="system"><AdminText>{"Système"}</AdminText></option>
            </select> : ['icon','vehicle_type','service_key','type'].includes(key)?<select value={String(data[key]||'')} onChange={e=>setData({...data,[key]:e.target.value})}><option value=""><AdminText>{"—"}</AdminText></option>{(key==='icon'?['bus','package','users','compass','truck']:key==='vehicle_type'?['minibus','coach','tipper','trailer']:key==='service_key'?['voyageurs','messagerie','personnel','tourisme','bennes']:['voyageurs','messagerie']).map(value=><option key={value} value={value}>{t(optionNames[value]||value)}</option>)}</select>: Array.isArray(data[key])||/^(values|milestones|features)_(fr|ar)$/.test(key) ? <textarea value={Array.isArray(data[key])?(data[key] as string[]).join('\n'):''} onChange={e => setData({ ...data, [key]: e.target.value.split('\n') })}/> : <textarea rows={String(data[key] || '').length > 150 ? 4 : 2} maxLength={5000} value={typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key] ?? '')} onChange={e => setData({ ...data, [key]: e.target.value })}/>}</label>)}</div><div className="editor-preview" dir={lang==='ar'?'rtl':'ltr'}><small><AdminText>{"APERÇU DU CONTENU /"}</AdminText>{lang.toUpperCase()}</small><h3>{previewTitle[lang] || t('Votre titre')}</h3><p>{String(data[`body_${lang}`]||data[`footer_${lang}`]||data[`description_${lang}`]||'')}</p>{data[`cta_${lang}`]?<span className="status-badge">{String(data[`cta_${lang}`])}</span>:null}</div>{typeof data.image === 'string' && data.image && <div style={{ height: 180, marginBottom: 20 }}>
        <Media src={data.image} alt={row.label_fr}/>
        </div>}<label className="checkbox">
    <input type="checkbox" name="is_active" defaultChecked={row.is_active}/><AdminText>{"Publié"}</AdminText></label>
    <div className="admin-actions">
    <button className="button primary" disabled={busy}>{busy ? '…' : t('Enregistrer')}</button>{row.id && table !== 'site_settings' && <button type="button" className="button danger" disabled={busy} onClick={async () => { if (!confirm(t('Supprimer cet élément ?')))
        return; setBusy(true);try{ const result = await deleteRow(table, row.id); setMsg(result.error || 'Supprimé'); if (result.ok)
        refresh();}catch{setMsg('Suppression impossible')}finally{setBusy(false)} }}><AdminText>{"Supprimer"}</AdminText></button>}</div>
    <p role="status" className={msg ? "admin-toast" : "admin-muted"}>{t(msg)}{dirty ? t(' • Modifications non enregistrées') : ''}</p>
    </form>
    </article>;
}
export function MediaUpload() {
    const {t}=useAdminLanguage();
    const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
    const router = useRouter();
    return <form className="admin-card" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
        const result = await uploadMedia(new FormData(e.currentTarget));
        setMsg(result.error || `Image enregistrée : ${result.url}`);
        if (result.ok)
            router.refresh();
    }
    catch {
        setMsg('Erreur');
    }
    finally {
        setBusy(false);
    } }}>
    <label><AdminText>{"Image JPEG, PNG, WebP, AVIF — 8 Mo"}</AdminText><input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" required/>
    </label>
    <label><AdminText>{"Texte alternatif FR"}</AdminText><input name="alt_fr" maxLength={300}/>
    </label>
    <label dir="rtl"><AdminText>{"النص البديل AR"}</AdminText><input name="alt_ar" maxLength={300}/>
    </label>
    <button className="button primary" disabled={busy}>{busy ? '…' : t('Importer')}</button>
    <p className="admin-muted" role="status">{t(msg)}</p>
    </form>;
}
export function ComplaintEditor({ id, status, notes, email }: {
    id: string;
    status: string;
    notes: string;
    email: string;
}) {
    const {t}=useAdminLanguage();
    const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
    return <form onSubmit={async (e) => { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true);try{ const result = await updateComplaint(id, String(data.get('status')), String(data.get('notes'))); setMsg(result.error || 'Enregistré');}catch{setMsg('Sauvegarde impossible')}finally{setBusy(false)} }}>
    <label><AdminText>{"Statut"}</AdminText><select name="status" defaultValue={status}>
    <option value="new"><AdminText>{"Nouvelle"}</AdminText></option>
    <option value="in_progress"><AdminText>{"En cours"}</AdminText></option>
    <option value="resolved"><AdminText>{"Traitée"}</AdminText></option>
    <option value="archived"><AdminText>{"Archivée"}</AdminText></option>
    </select>
    </label>
    <label><AdminText>{"Notes internes privées"}</AdminText><textarea name="notes" defaultValue={notes} maxLength={5000}/>
    </label>
    <div className="admin-actions">
    <button className="button primary" disabled={busy}><AdminText>{"Enregistrer"}</AdminText></button>
    <a className="button" href={`mailto:${encodeURIComponent(email)}`}><AdminText>{"Préparer une réponse"}</AdminText></a>
    </div>
    <p role="status">{t(msg)}</p>
    </form>;
}
