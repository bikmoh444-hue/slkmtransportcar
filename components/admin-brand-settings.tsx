'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Save} from 'lucide-react';
import type {RecordData} from '@/lib/model';
import {saveBrandWithMedia} from '@/app/admin/actions';
import {useAdminLanguage} from './admin-language';
import {ImageField} from './admin-image-field';
import {notifyContentUpdated} from '@/lib/content-events';
const fields=[['logo','Logo principal'],['footer_logo','Logo du footer'],['favicon','Icône de l’onglet'],['og_image','Image de partage']] as const;
export function BrandSettings({row}:{row?:RecordData}){
 const {t}=useAdminLanguage(),router=useRouter();
 const [assets,setAssets]=useState<Record<string,string>>(()=>Object.fromEntries(fields.map(([key])=>[key,String(row?.data[key]||'')])));
 const [files,setFiles]=useState<Record<string,File>>({});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
 return <section className="admin-card brand-settings" id="logo-icone"><h2>{t('Logo et icône du site')}</h2><p>{t('Modifiez le logo principal et le favicon ici. Importez une image, puis enregistrez pour publier les changements.')}</p><form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const fd=new FormData();Object.entries(files).forEach(([key,file])=>fd.set(key,file));const result=await saveBrandWithMedia(assets,fd);setMessage(result.error||'Modifications enregistrées.');if(result.ok){if(result.data)setAssets(result.data);setFiles({});setDirty(false);notifyContentUpdated();router.refresh()}}catch{setMessage('Sauvegarde impossible')}finally{setBusy(false)}}}><div className="brand-assets-grid">{fields.map(([key,title])=><div className="brand-asset" key={key}><h3>{t(title)}</h3><ImageField id={key} purpose={key} value={assets[key]} file={files[key]} disabled={busy} onFile={file=>{setFiles(current=>{const next={...current};if(file)next[key]=file;else delete next[key];return next});setDirty(true)}} onValue={value=>{setAssets({...assets,[key]:value});setDirty(true)}}/></div>)}</div><p className="admin-muted">{t('Le logo est utilisé dans la navigation et le pied de page. L’icône apparaît dans l’onglet du navigateur.')}</p><button className="button primary" disabled={busy||!dirty}><Save size={16}/>{t('Enregistrer les logos et l’icône')}</button><p role="status" className="admin-muted">{t(message)}</p></form></section>
}

