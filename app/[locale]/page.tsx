import {PublicContentRefresh} from '@/components/public-content-refresh';
import {publicIdentity} from '@/lib/security/settings';
import {VisitTracker} from '@/components/visit-tracker';
import {themeStyle} from '@/lib/theme';
import {FloatingContact} from '@/components/floating-contact';
import { Organization } from '@/components/organization';
import { NetworkRecords } from '@/components/network-records';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { ArrowRight, ArrowUpRight, Bus, Package, Users, Compass, Truck, Phone, Mail, Check, MapPin } from 'lucide-react';
import { getContent, preview } from '@/lib/content';
import { field, label, type Locale, type RecordData } from '@/lib/model';
import { Hero, Navigation, Language, MapView, ScrollControls, ComplaintForm } from '@/components/interactions';
import { Media } from '@/components/media';
import { Brand } from '@/components/social';
import { configured } from '@/lib/supabase';
export async function generateMetadata({ params }: {
    params: Promise<{
        locale: string;
    }>;
}): Promise<Metadata> { const { locale } = await params; if (locale !== 'fr' && locale !== 'ar')
    return {}; const content = await getContent(); const seo = content.seo_settings[0]; const url = process.env.NEXT_PUBLIC_SITE_URL; const icon = field(publicIdentity(content), 'favicon'); return { title: seo ? label(seo, locale) : 'SLKM', description: field(seo, 'description', locale), robots: { index: !!url && !preview(), follow: !!url && !preview() }, ...(icon ? { icons: { icon } } : {}), ...(url ? { metadataBase: new URL(url), alternates: { canonical: `/${locale}`, languages: { fr: '/fr', ar: '/ar', 'x-default': '/fr' } }, openGraph: { title: seo ? label(seo, locale) : 'SLKM', locale: locale === 'ar' ? 'ar_MA' : 'fr_MA', url: `/${locale}`, type: 'website', ...(field(seo, 'og_image') || field(publicIdentity(content), 'og_image') ? { images: [field(seo, 'og_image') || field(publicIdentity(content), 'og_image')] } : {}) } } : {}) }; }
const icons = { bus: Bus, package: Package, users: Users, compass: Compass, truck: Truck };
function SectionExtras({row,locale}:{row:RecordData;locale:Locale}) {
    return <>{field(row,'second',locale)&&<p className="section-extra-text">{field(row,'second',locale)}</p>}{field(row,'image')&&<div className="section-extra-media"><Media src={field(row,'image')} alt={label(row,locale)} contain/></div>}</>;
}
function Logo({ src, footer = false }: {
    src: string;
    footer?: boolean;
}) {
    return src ? <div className={`logo-image ${footer ? 'footer-logo' : ''}`}>
    <Media src={src} alt="SLKM — نقل مولاي مبارك" contain/>
    </div> : <span className="wordmark">
    <strong>SLKM<span>↗</span>
    </strong>
    <small lang="ar">نقل مولاي مبارك</small>
    </span>;
}
export default async function PublicPage({ params }: {
    params: Promise<{
        locale: string;
    }>;
}) {
    const { locale: raw } = await params;
    if (raw !== 'fr' && raw !== 'ar')
        notFound();
    const locale: Locale = raw, ar = locale === 'ar';
    const c = await getContent();
    const s = publicIdentity(c);
    const whatsapp = `${field(s, 'whatsapp') || 'https://wa.me/212661675387'}?text=${encodeURIComponent(ar ? 'مرحباً، أود الاستفسار عن خدمات SLKM.' : 'Bonjour, je souhaite me renseigner sur les services SLKM.')}`;
    const title = (row: RecordData | undefined) => row ? <>
    <p className="eyebrow">{field(row, 'eyebrow', locale)}</p>
    <h2>{label(row, locale)}</h2>
    </> : null;
    return <NextIntlClientProvider locale={locale} messages={{}} formats={{}} now={new Date()} timeZone="Africa/Casablanca">
    <div className={`public-site ${field(s, 'font') === 'system' ? 'system-font' : ''}`} style={themeStyle(s?.data)}>
    <a className="skip" href="#main">{ar ? 'انتقل إلى المحتوى' : 'Aller au contenu'}</a>
    <header className="site-header">
    <div className="container header-inner">
    <a href={`/${locale}`} aria-label="SLKM">
    <Logo src={field(s, 'logo')}/>
    </a>
    <Navigation items={c.navigation_items} locale={locale}/>
    <div className="header-actions">
    <Language locale={locale}/>
    <a className="button small primary header-contact" href="#contact">{ar ? 'تواصل معنا' : 'Contactez-nous'}<ArrowUpRight size={15}/>
    </a>
    </div>
    </div>
    </header>
    <Organization settings={s}/><VisitTracker/><PublicContentRefresh/>
    <main id="main">
    <Hero slides={c.hero_slides} locale={locale}/>{preview() && <div className="preview-note container">{ar ? 'معاينة محلية • الصور وSupabase في انتظار الإعداد' : 'Prévisualisation locale • Photos et Supabase à configurer'}</div>}<div className="container quick-links">
    <a href="#reseau">
    <Bus />
    <span>{ar ? 'تنقلاتكم' : 'Vos déplacements'}</span>
    <ArrowUpRight size={18}/>
    </a>
    <a href="#messagerie">
    <Package />
    <span>{ar ? 'إرسال طرودكم' : 'Vos envois'}</span>
    <ArrowUpRight size={18}/>
    </a>
    <a href="#transports">
    <Truck />
    <span>{ar ? 'مشاريعكم المهنية' : 'Vos projets professionnels'}</span>
    <ArrowUpRight size={18}/>
    </a>
    </div>{c.page_sections.map(row => {
            const k = row.key;
            if (k === 'histoire')
                return <section className="container section story two-col" id={k} key={k}>
                <div className="story-photo">
                <Media src={field(row, 'image')} alt={ar ? 'مركبات SLKM' : 'Véhicules SLKM'}/>
                </div>
                <div>{title(row)}<p>{field(row, 'body', locale)}</p>
                <p>{field(row, 'second', locale)}</p>{Array.isArray(row.data[`milestones_${locale}`]) && (row.data[`milestones_${locale}`] as string[]).length > 0 && <ol className="timeline">{(row.data[`milestones_${locale}`] as string[]).map(x => <li key={x}>{x}</li>)}</ol>}<div className="values">{(row.data[`values_${locale}`] as string[] || []).map(x => <span key={x}>
                    <Check size={16}/>{x}</span>)}</div>
                </div>
                </section>;
            if (k === 'services')
                return <section className="section services-section" id={k} key={k}>
                <div className="container">
                <div className="section-heading">
                <div>{title(row)}</div>
                <ScrollControls id="services-track" locale={locale}/>
                </div>
                {field(row,'body',locale)&&<p className="section-intro">{field(row,'body',locale)}</p>}<SectionExtras row={row} locale={locale}/>
                <div className="services-grid snap-track" id="services-track">{c.services.map((service, i) => {
                        const Icon = icons[field(service, 'icon') as keyof typeof icons] || Bus;
                        return <article className="service-card" key={service.key}>
                        <div className="service-image">
                        <Media src={field(service, 'image')} alt={field(service, 'alt', locale) || label(service, locale)}/>
                        <span className="number">0{i + 1}</span>
                        </div>
                        <div className="service-body">
                        <Icon size={23}/>
                        <h3>{label(service, locale)}</h3>
                        <p>{field(service, 'body', locale)}</p>{field(service, 'detail', locale) && <details>
                            <summary>{ar ? 'تفاصيل الخدمة' : 'Détails du service'}</summary>
                            <p>{field(service, 'detail', locale)}</p>
                            </details>}<a href={field(service, 'href') || '#contact'} className="text-link">{field(service, 'cta', locale) || (ar ? 'اكتشف المزيد' : 'En savoir plus')}<ArrowUpRight size={18}/>
                        </a>
                        </div>
                        </article>;
                    })}</div>
                </div>
                </section>;
            if (k === 'reseau' || k === 'messagerie') {
                const map = c.network_maps.find(x => x.key === (k === 'reseau' ? 'voyageurs' : 'messagerie'));
                return <section className={`section container two-col network ${k === 'messagerie' ? 'reverse' : ''}`} id={k} key={k}>
                <div>{title(row)}<p>{field(row, 'body', locale)}</p>
                <SectionExtras row={row} locale={locale}/>
                <div className="network-detail">
                <MapPin size={22}/>
                <p>{ar ? 'تواصلوا معنا لمعرفة الوجهات والخطوط والمواعيد المتاحة.' : 'Contactez-nous pour connaître les destinations, lignes et horaires disponibles.'}</p>
                </div>
                <a className="button primary" href={whatsapp}>
                <Brand name="whatsapp"/>{ar ? 'استفسروا عن الشبكة' : 'Se renseigner sur le réseau'}<ArrowRight size={17}/>
                </a>
                </div>
                <div>
                <NetworkRecords content={c} locale={locale} type={k === 'reseau' ? 'voyageurs' : 'messagerie'}/>
                <div className="map-frame">
                <span className="map-label">{map ? label(map, locale) : 'SLKM'}</span>
                <MapView src={field(map, 'image')} title={map ? label(map, locale) : 'SLKM'} locale={locale}/>
                {field(map,'body',locale)&&<p>{field(map,'body',locale)}</p>}
                </div>
                </div>
                </section>;
            }
            ;
            if (k === 'transports')
                return <section className="section fleet-section" id={k} key={k}>
                <div className="container">
                <div className="section-heading">
                <div>{title(row)}</div>
                <ScrollControls id="fleet-track" locale={locale}/>
                </div>
                <p className="section-intro">{field(row, 'body', locale)}</p>
                <SectionExtras row={row} locale={locale}/>
                <div className="fleet-grid snap-track" id="fleet-track">{c.fleet_items.map(item => <article className="fleet-card" key={item.key}>
                    <Media src={field(item, 'image')} alt={field(item,'alt',locale)||label(item, locale)}/>
                    <div>
                    <h3>{label(item, locale)}{typeof item.data.seats === 'number' && <span className="capacity">{item.data.seats} {ar ? 'مقعداً' : 'places'}</span>}</h3>
                    <p>{field(item, 'body', locale)}</p>{Array.isArray(item.data[`features_${locale}`]) && (item.data[`features_${locale}`] as string[]).length > 0 && <ul className="fleet-features">{(item.data[`features_${locale}`] as string[]).map(x => <li key={x}>{x}</li>)}</ul>}<a className="text-link" href={field(item,'href')||'#contact'}>{field(item,'cta',locale)||(ar ? 'تواصلوا معنا' : 'Parlons de votre besoin')}<ArrowUpRight size={17}/>
                    </a>
                    </div>
                    </article>)}</div>
                </div>
                </section>;
            if (k === 'contact')
                return <section className="container section contact-grid" id={k} key={k}>
                <div>{title(row)}<p>{field(row, 'body', locale)}</p>
                <SectionExtras row={row} locale={locale}/>
                <div className="contact-links">
                <a href={`tel:${field(s, 'phone').replace(/[^0-9+]/g, '').replace(/^0/, '+212')}`}>
                <Phone />
                <span>
                <small>{ar ? 'الهاتف الثابت' : 'Téléphone fixe'}</small>
                <bdi>{field(s, 'phone')}</bdi>
                </span>
                <ArrowUpRight size={18}/>
                </a>
                <a href={`tel:${field(s, 'mobile').replace(/[^0-9+]/g, '').replace(/^0/, '+212')}`}>
                <Phone />
                <span>
                <small>{ar ? 'الهاتف المحمول' : 'Mobile'}</small>
                <bdi>{field(s, 'mobile')}</bdi>
                </span>
                <ArrowUpRight size={18}/>
                </a>
                <a href={`mailto:${field(s, 'email')}`}>
                <Mail />
                <span>
                <small>{ar ? 'البريد الإلكتروني' : 'Email'}</small>
                <bdi>{field(s, 'email')}</bdi>
                </span>
                <ArrowUpRight size={18}/>
                </a>{field(s, 'address', locale) && <p>{field(s, 'maps_url')?<a href={field(s,'maps_url')} target="_blank" rel="noopener noreferrer">{field(s,'address',locale)}</a>:field(s,'address',locale)}</p>}</div>
                {field(s,'hours',locale)&&<p>{field(s,'hours',locale)}</p>}<div className="social-links">
                <a href={whatsapp} aria-label="WhatsApp">
                <Brand name="whatsapp"/>
                </a>{(['facebook', 'instagram'] as const).map(name => /^https:\/\//.test(field(s, name)) && <a href={field(s, name)} key={name} aria-label={name}>
                    <Brand name={name}/>
                    </a>)}</div>
                </div>
                <ComplaintForm locale={locale} available={!preview() && configured() && !!process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.RATE_LIMIT_SECRET?.length || 0) >= 32}/>
                </section>;
            return <section className="container section" id={k} key={k}>{title(row)}<p>{field(row,'body',locale)}</p>{field(row,'second',locale)&&<p>{field(row,'second',locale)}</p>}{field(row,'image')&&<div style={{height:300,marginTop:24}}><Media src={field(row,'image')} alt={label(row,locale)}/></div>}</section>;
        })}</main>
    <footer>
    <div className="container footer-grid">
    <div>
    <Logo src={field(s, 'footer_logo') || field(s, 'logo')} footer/>
    <p>{field(s, 'footer', locale)}</p>
    </div>
    <div>
    <h3>{ar ? 'اكتشفوا SLKM' : 'Explorer SLKM'}</h3>{c.navigation_items.map(x => <a key={x.key} href={field(x, 'target')}>{label(x, locale)}</a>)}</div>
    <div>
    <h3>{ar ? 'تواصلوا معنا' : 'Restons en contact'}</h3>
    <a href={`tel:${field(s,'phone').replace(/[^0-9+]/g,'').replace(/^0/,'+212')}`}>
    <bdi>{field(s, 'phone')}</bdi>
    </a>
    <a href={`tel:${field(s,'mobile').replace(/[^0-9+]/g,'').replace(/^0/,'+212')}`}>
    <bdi>{field(s, 'mobile')}</bdi>
    </a>
    <a href={`mailto:${field(s, 'email')}`}>
    <bdi>{field(s, 'email')}</bdi>
    </a>
    <a href={field(s, 'facebook')}>Facebook</a>
    </div>
    </div>
    <div className="container footer-bottom">
    <span>© {new Date().getFullYear()} {s?label(s,locale):'SLKM'}</span>
    <div>
    <a href={`/${locale}/confidentialite`}>{ar ? 'الخصوصية' : 'Confidentialité'}</a>
    <a href={`/${locale}/mentions-legales`}>{ar ? 'البيانات القانونية' : 'Mentions légales'}</a>
    </div>{field(s, 'studio_url') ? <a href={field(s, 'studio_url')}>By HM Studio</a> : <span>By HM Studio</span>}</div>
    </footer>
    <FloatingContact href={whatsapp} locale={locale}/>
    </div>
    </NextIntlClientProvider>;
}
