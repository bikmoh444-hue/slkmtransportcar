'use client';
import {createContext,useContext} from 'react';
import {translateAdmin,type AdminLocale} from '@/lib/admin-i18n';
const Context=createContext<AdminLocale>('fr');
export function AdminLanguageProvider({locale,children}:{locale:AdminLocale;children:React.ReactNode}){return <Context.Provider value={locale}>{children}</Context.Provider>}
export function useAdminLanguage(){const locale=useContext(Context);return {locale,t:(text:string)=>translateAdmin(text,locale)}}
export function AdminText({children}:{children:React.ReactNode}){const {t}=useAdminLanguage();return <>{typeof children==='string'?t(children):children}</>}
