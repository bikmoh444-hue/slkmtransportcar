'use client';

import {AdminText, useAdminLanguage} from '@/components/admin-language';

import {AdminLanguageProvider} from './admin-language';

import type {AdminLocale} from '@/lib/admin-i18n';

import Link from 'next/link';

import {useEffect,useState} from 'react';



import {LayoutDashboard,Home,BookOpen,Route,Bus,Package,Menu,MessageSquare,Settings,PanelLeftClose,ExternalLink,Bell,LogOut,X,ChevronDown} from 'lucide-react';

import {logout} from '@/app/admin/actions';

const groups=[{name:'SLKM',items:[['overview','Statistiques',LayoutDashboard,'/admin'],['accueil','Accueil',Home,'/admin/accueil'],['histoire','Notre histoire',BookOpen,'/admin/notre-histoire'],['reseau','Lignes et réseau',Route,'/admin/lignes-reseau'],['messagerie','Messagerie',Package,'/admin/messagerie'],['location','Location de transport',Bus,'/admin/location-transport'],['contact','Contact',MessageSquare,'/admin/contact'],['site_settings','Paramètres',Settings,'/admin/parametres']]}];

export function AdminShell({locale, ...props}:{locale:AdminLocale;dateLabel:string;section:string;title:string;children:React.ReactNode}){return <AdminLanguageProvider locale={locale}><ShellContent {...props}/></AdminLanguageProvider>}

function ShellContent({section,title,children,dateLabel}:{dateLabel:string;section:string;title:string;children:React.ReactNode}){

 const {locale,t}=useAdminLanguage();

 const [closedGroups,setClosedGroups]=useState<string[]>([]);

 const [collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false);

 useEffect(()=>{if(!mobile)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setMobile(false)};window.addEventListener('keydown',close);return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',close)}},[mobile]);



 return <div className={`admin-shell v2 ${collapsed?'collapsed':''}`} dir={locale==='ar'?'rtl':'ltr'} lang={locale}><aside className={`admin-sidebar ${mobile?'drawer-open':''}`}><Link prefetch={false} href="/admin" className="admin-brand"><AdminText>{"S"}</AdminText><span><AdminText>{"L"}</AdminText></span><AdminText>{"KM"}</AdminText><small><AdminText>{"ESPACE ADMINISTRATION"}</AdminText></small></Link><button className="mobile-close" onClick={()=>setMobile(false)} aria-label={t("Fermer le menu")}><X size={20}/></button><div className="admin-nav">{groups.map(group=><section className="admin-nav-group" key={group.name}><button className="nav-group-toggle" type="button" aria-expanded={!closedGroups.includes(group.name)} onClick={()=>setClosedGroups(current=>current.includes(group.name)?current.filter(x=>x!==group.name):[...current,group.name])}>{t(group.name)}<ChevronDown size={12}/></button><div hidden={closedGroups.includes(group.name)}>{group.items.map(item=>{const [key,label,Icon,url]=item;const Symbol=Icon as typeof Home;return <Link prefetch={false} onClick={()=>setMobile(false)} title={t(String(label))} key={String(key)} href={String(url||`/admin?section=${key}`)} aria-current={section===key?'page':undefined}><Symbol size={18}/><span>{t(String(label))}</span></Link>})}</div></section>)}</div><div className="sidebar-foot"><AdminText>{"SLKM · Transport & Logistique"}</AdminText></div></aside>{mobile&&<button className="drawer-shade" aria-label={t("Fermer le menu")} onClick={()=>setMobile(false)}/>}<div className="admin-workspace"><header className="v2-topbar"><button className="admin-icon desktop-collapse" aria-label={t("Réduire le menu")} onClick={()=>setCollapsed(!collapsed)}><PanelLeftClose size={20}/></button><button className="admin-icon mobile-menu" aria-label={t("Ouvrir le menu")} aria-expanded={mobile} onClick={()=>setMobile(true)}><Menu size={20}/></button><select className="admin-language-select" aria-label={t('Langue de l’administration')} value={locale} onChange={e=>{document.cookie=`slkm-admin-locale=${e.target.value==='ar'?'ar':'fr'}; Path=/admin; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;location.reload()}}><option value="fr">Français</option><option value="ar">العربية</option></select><span className="topbar-label"><AdminText>{"Espace de gestion"}</AdminText></span><Link prefetch={false} className="button website-link" href={`/${locale}`} target="_blank"><ExternalLink size={15}/><AdminText>{"Voir le site"}</AdminText></Link><Link prefetch={false} className="admin-icon" href="/admin/contact" title={t("Notifications : réclamations")}><Bell size={19}/></Link><Link prefetch={false} className="admin-profile" href="/admin/parametres"><b><AdminText>{"AD"}</AdminText></b><span><AdminText>{"Administrateur"}</AdminText><small><AdminText>{"Compte sécurisé"}</AdminText></small></span></Link><form action={logout}><button className="admin-icon" title={t("Déconnexion")} aria-label={t("Déconnexion")}><LogOut size={18}/></button></form></header><main className="admin-main"><div className="v2-heading"><div><p className="admin-eyebrow"><AdminText>{"SLKM / ADMINISTRATION"}</AdminText></p><h1>{t(title)}</h1><p>{t(section==='overview'?'Vue générale de votre plateforme SLKM':'Gérez les contenus et les informations de votre plateforme.')}</p></div><time>{dateLabel}</time></div>{children}</main></div></div>

}

