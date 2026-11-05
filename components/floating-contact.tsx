'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@/lib/model';
import {Brand} from './social';
export function FloatingContact({href,locale}:{href:string;locale:Locale}){
 const [hide,setHide]=useState(false);
 useEffect(()=>{
  const form=document.querySelector('.complaint');
  if(!form||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>setHide(entries.some(entry=>entry.isIntersecting)),{rootMargin:'24px'});
  observer.observe(form);return()=>observer.disconnect();
 },[]);
 return <a hidden={hide} className="whatsapp-float" href={href} aria-label={locale==='ar'?'تواصلوا معنا عبر واتساب':'Contacter SLKM sur WhatsApp'}><Brand name="whatsapp"/></a>;
}
